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

    came_from = {start: None}
    cost_so_far = {start: 0}

    while frontier:

        pass





    # TODO extract path via came_from

    path = None
    cost = None

    return JumpPath(path, cost)

GraphEdge = collections.namedtuple("GraphEdge", ["destination", "cost"])
# Not currently planning for this to be directly serialised, so no yaml representer

def possible_jump_graph(direct_distances, drive_level):
    system_names = sorted(direct_distances.keys())

    # Mapping of node name to list of outgoing edges
    graph = {s:[] for s in system_names}

    for start in system_names:
        for end in system_names:
            distance = direct_distances[start][end]

            # A jump is valid for the current drive if the distance is less than or equal to the drive level
            if 1 <= distance <= drive_level:
                # Edge weight/cost is (6 days * hexes) / drive_level
                weight = 6 * distance / drive_level
                # Weight will never exceed 6 because of jump validity restriction
                assert 1 <= weight <= 6

                graph[start] = GraphEdge(end, weight)

    return graph

def find_jump_paths(direct_distances, drive_level):
    system_names = sorted(direct_distances.keys())

    # Optimal paths between systems at a particular drive level
    paths = {s:{e:None for e in system_names} for s in system_names}

    # Generate this now, can be reused
    possible_jumps = possible_jump_graph(direct_distances, drive_level)

    for start in system_names:
        for end in system_names:
            # Optimise by reusing reverse path (end->start)
            if paths[start][end] is None:
                path = pathfind(possible_jumps, start, end, lambda s,e: direct_distances[s][e])
                paths[start][end] = path
                paths[end][start] = JumpPath(list(reversed(path.nodes)), path.cost)

    return paths

def find_all_jump_paths(direct_distances, max_drive_level=6):
    # Optimal paths between systems at all drive levels between 1 and max_drive_level
    all_paths = dict()
    for level in range(1, max_drive_level + 1):
        all_paths[level] = find_jump_paths(direct_distances, level)
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

def dump_json(obj, path):
    with open(path + ".json", "w") as f:
        json.dump(
            obj=obj,
            fp=f,
            ensure_ascii=False,
            sort_keys=not yaml_available,
            indent=None if yaml_available else 4,
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

def write_reports(output_dir, systems, direct_distances, paths, path_costs):
    os.makedirs(output_dir, exist_ok=True)

    def dump(obj, prefix):
        dump_json(obj, prefix)
        dump_yaml(obj, prefix)

    systems_file = os.path.join(output_dir, "systems")
    dump(systems, systems_file)

    direct_distances_file = os.path.join(output_dir, "direct_distances")
    dump(direct_distances, direct_distances_file)

    #paths_file = os.path.join(output_dir, "paths.json")
    #dump(paths, paths_file)

#
# Main
#

def process(input, output_dir, max_drive_level):
    # Open stream if required
    if input == "-":
        process(sys.stdin, output_dir, max_drive_level)
    elif isinstance(input, str):
        with open(input, "r") as i:
            process(i, output_dir, max_drive_level)

    # Do actual processing
    else:
        systems = read_tiddlywiki(input)
        direct_distances = cube_distances_complete(systems)
        #paths = find_all_jump_paths(direct_distances, max_drive_level)
        paths = None
        write_reports(output_dir, systems, direct_distances, paths, path_costs)

def main():

    # TODO add subcommands? drive isn't always needed if tsv won't contain distance info (any readable way to encode that info in tsv?). Probably can just generate a directory of files?

    # TODO probably better to use a table rather than a graph for distance info output? ==> Can't show the route with a table, but could have alternative output mode to show the minimum distance that needs to be travelled between two systems for a particular spike drive level.

    # TODO is there any way to show all drive levels at once? ==> Color coding? Note: lower drive levels may not be able to get everywhere in the sector, higher drive levels may be able to take shorter paths

    # TODO need to include elapsed time information? The only time it isn't 6 days per jump is when jumping less than the maximum distance the spike drive can travel, ex: drive level 3 jumps 1 hex in (6*1)/3=2 days, 2 hexes in (6*2)/3=4 days, 3 hexes in (6*3)/3=6 days

    # TODO: note that the visualisation of a spike drive level >1 is there are more connections added between the nodes (Sectors), with different time weights attached to them (drive level =1, at most one connection between nodes, of six day length). Should be able to use standard shortest-path algos on this problem. Heuristic is point-to-point (single-hop, infinite drive level) distance (can precomputed easily)? ==> Admissiblity of that for A*?

    parser = argparse.ArgumentParser(description="Convert system data from a TiddlyWiki created by SWN Sector Generator into ship transit data.")
    parser.add_argument("-o", "--output-dir", help="Directory to write the output files into. Default: name portion of the input file")
    parser.add_argument("-m", "--max-drive-level", default=6, help="Maximum spike drive level. Default: 6")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")

    args = parser.parse_args()

    if args.output_dir is None:
        output_dir = os.path.splitext(os.path.basename(os.path.normpath(args.input)))[0]
    else:
        output_dir = args.output_dir

    process(args.input, output_dir, args.max_drive_level)

if __name__ == "__main__":
    main()
