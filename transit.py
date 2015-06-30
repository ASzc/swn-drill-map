#!/usr/bin/env python3

import argparse
import collections
import heapq
import itertools
import json
import os
import re
import string
import sys

try:
    import yaml
except ImportError:
    yaml_available = False
else:
    yaml_available = True
    def namedtuple_representer(name):
        tag = "!" + name
        def representer(dumper, data):
            return dumper.represent_mapping(tag, data.__dict__)
        return representer

#
# Hex Grid Calculations
#

# http://www.redblobgames.com/grids/hexagons/#coordinates
# SWN hex grids are an "odd-q" layout (flat bottoms, high top-left corner) with "offset" coordinates.

def offset_to_cube(col, row):
    x = col
    z = row - (col - (col % 2)) // 2
    y = -1 * x - z

    return CubeCoord(x, z, y)

def cube_distance(a, b):
    return max(abs(a.x - b.x), abs(a.y - b.y), abs(a.z - b.z))

def cube_distances_complete(systems):
    # Complete graph of the direct point-to-point distances between hexes
    direct = {s.name:{e.name:None for e in systems} for s in systems}

    for start in systems:
        for end in systems:
            # Optimise by reusing reverse distance (end->start)
            if direct[start.name][end.name] is None:
                distance = cube_distance(start.cube, end.cube)
                direct[start.name][end.name] = distance
                direct[end.name][start.name] = distance

    return direct

#
# Pathfinding
#

JumpPath = collections.namedtuple("JumpPath", ["nodes", "cost"])
if yaml_available:
    yaml.add_representer(JumpPath, namedtuple_representer("jump_path"))

def pathfind(graph, start, end, heuristic):
    # A* search, assuming monotonic/consistent heuristic.

    already_checked = set()

    frontier = []
    frontier_tiebreaker = itertools.count()
    heapq.heappush(frontier, (0, next(frontier_tiebreaker), start))

    came_from = {}
    cost_so_far = {start: 0}

    while frontier:
        current = heapq.heappop(frontier)[2]

        if current == end:
            break

        # This optimisation requires a monotonic/consistent heuristic
        already_checked.add(current)

        for neighbour in graph[current].keys():
            if neighbour not in already_checked:
                new_cost = cost_so_far[current] + graph[current][neighbour]

                if neighbour not in cost_so_far or new_cost < cost_so_far[neighbour]:
                    cost_so_far[neighbour] = new_cost
                    came_from[neighbour] = current
                    priority = new_cost + heuristic(neighbour, end)
                    heapq.heappush(frontier, (priority, next(frontier_tiebreaker), neighbour))
    else:
        return None

    # Total cost of the found path
    cost = cost_so_far[current]

    # Determine path via came_from
    path = []
    while current in came_from:
        path.append(current)
        current = came_from[current]
    path.append(start)

    return list(reversed(path))

def possible_jump_graph(hex_distances, drive_level):
    system_names = sorted(hex_distances.keys())

    # Mapping of node name to map of destination node names to costs
    graph = {s:{} for s in system_names}

    for start in system_names:
        for end in system_names:
            distance = hex_distances[start][end]

            # A jump is valid for the current drive if the distance is less than or equal to the drive level
            if 1 <= distance <= drive_level:
                assert end not in graph[start], "should be only one edge weight between two nodes"
                # Shortest path appears to be a better metric than time, and still time optimal?
                graph[start][end] = 1

    return graph

def find_jump_paths(hex_distances, drive_level):
    system_names = sorted(hex_distances.keys())

    # Optimal paths between systems at a particular drive level
    paths = {s:{e:None for e in system_names} for s in system_names}

    # Generate this now, can be reused
    possible_jumps = possible_jump_graph(hex_distances, drive_level)

    def distance_heuristic(a, b):
        return hex_distances[a][b]

    for start in system_names:
        for end in system_names:
            path = pathfind(possible_jumps, start, end, distance_heuristic)
            if path is not None:
                # Calculate time cost
                path_cost = 0
                prev_node = start
                for node in path:
                    distance = hex_distances[prev_node][node]
                    time = 6 * distance / drive_level
                    assert 0 <= time <= 6, "should not be a self loop or exceed jump validity for the drive level"
                    path_cost += time
                    prev_node = node

                paths[start][end] = JumpPath(path, path_cost)

    return paths

def find_all_jump_paths(hex_distances, max_drive_level=6):
    # Optimal paths between systems at all drive levels between 1 and max_drive_level
    all_paths = dict()
    for level in range(1, max_drive_level + 1):
        paths = find_jump_paths(hex_distances, level)
        all_paths[level] = paths
    return all_paths

#
# Read
#

grid_pattern = re.compile(r'GRID (?P<x>[0-9]{2})(?P<y>[0-9]{2})')

CubeCoord = collections.namedtuple("CubeCoord", ["x", "z", "y"])
OffsetCoord = collections.namedtuple("OffsetCoord", ["x", "y"])
System = collections.namedtuple("System", ["name", "offset", "cube"])
if yaml_available:
    yaml.add_representer(CubeCoord, namedtuple_representer("cube"))
    yaml.add_representer(OffsetCoord, namedtuple_representer("offset"))
    yaml.add_representer(System, namedtuple_representer("system"))

def read_tiddlywiki(input):
    import bs4

    systems = []

    soup = bs4.BeautifulSoup(input)
    for d in soup.find_all("div"):
        if "title" in d.attrs and d.attrs["title"].startswith("System:"):
            # Get system name
            name = string.capwords(d.attrs["title"][7:])

            # Get coords from hex number
            match = grid_pattern.search(d.text)
            raw_coords = match.groupdict()
            x = int(raw_coords["x"])
            y = int(raw_coords["y"])

            # Store both coord systems
            offset_coords = OffsetCoord(x, y)
            cube_coords = offset_to_cube(*offset_coords)

            systems.append(System(
                name=name,
                offset=offset_coords,
                cube=cube_coords,
            ))

    return systems

#
# Write
#

def dump_json(obj, path, compact_json):
    with open(path + ".json", "w") as f:
        json.dump(
            obj=obj,
            fp=f,
            ensure_ascii=False,
            sort_keys=not compact_json,
            indent=None if compact_json else 4,
        )

def dump_yaml(obj, path):
    if yaml_available:
        with open(path + ".yaml", "w") as f:
            yaml.dump(
                data=obj,
                stream=f,
                default_flow_style=False,
                allow_unicode=True,
            )

#def dump_graphml():
#    pass

def write_reports(output_dir, compact_json, systems, hex_distances, paths):
    os.makedirs(output_dir, exist_ok=True)

    def dump(obj, prefix):
        dump_json(obj, prefix, compact_json)
        dump_yaml(obj, prefix)

    systems_file = os.path.join(output_dir, "systems")
    dump(systems, systems_file)

    hex_distances_file = os.path.join(output_dir, "hex_distances")
    dump(hex_distances, hex_distances_file)

    paths_file = os.path.join(output_dir, "paths")
    dump(paths, paths_file)

#
# Main
#

def process(input, output_dir, max_drive_level, compact_json):
    # Open stream if required
    if input == "-":
        process(sys.stdin, output_dir, max_drive_level, compact_json)
    elif isinstance(input, str):
        with open(input, "r") as i:
            process(i, output_dir, max_drive_level, compact_json)

    # Do actual processing
    else:
        systems = read_tiddlywiki(input)
        hex_distances = cube_distances_complete(systems)
        paths = find_all_jump_paths(hex_distances, max_drive_level)
        write_reports(output_dir, compact_json, systems, hex_distances, paths)

def main():

    # TODO probably better to use a table rather than a graph for distance info output? ==> Can't show the route with a table, but could have alternative output mode to show the minimum distance that needs to be travelled between two systems for a particular spike drive level.

    # TODO is there any way to show all drive levels at once? ==> Color coding? Note: lower drive levels may not be able to get everywhere in the sector, higher drive levels may be able to take shorter paths

    parser = argparse.ArgumentParser(description="Convert system data from a TiddlyWiki created by SWN Sector Generator into ship transit data.")
    parser.add_argument("-o", "--output-dir", help="Directory to write the output files into. Default: name portion of the input file")
    parser.add_argument("-m", "--max-drive-level", default=6, help="Maximum spike drive level. Default: 6")
    parser.add_argument("-c", "--compact-json", action="store_true", help="Do not pretty-print the .json files.")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")

    args = parser.parse_args()

    if args.output_dir is None:
        output_dir = os.path.splitext(os.path.basename(os.path.normpath(args.input)))[0]
    else:
        output_dir = args.output_dir

    process(args.input, output_dir, args.max_drive_level, args.compact_json)

if __name__ == "__main__":
    main()
