#!/usr/bin/env python3

import argparse
import collections
import json
import os
import re
import string
import sys

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

def pathfind(graph, start, end, heuristic):
    # TODO A*
    pass

def find_jump_paths(direct_distances, drive_level):
    system_names = sorted(direct_distances.keys())

    # Optimal paths between systems at a particular drive level
    paths = {s:{e:None for e in system_names} for s in system_names}

    # TODO need to pregenerate a graph with all possible jumps at this drive_level
    possible_jumps = None

    for start in system_names:
        for end in system_names:
            # Optimise by reusing reverse path (end->start)
            if paths[start][end] is None:
                path = pathfind(possible_jumps, start, end, lambda s,e: direct_distances[s][e])
                paths[start][end] = path
                # TODO total cost will be the same in a reversed path, don't know how it will be stored yet
                paths[end][start] = list(reversed(path))

    return paths

def find_all_jump_paths(direct_distances, max_drive_level=6):
    # Optimal paths between systems at all drive levels between 1 and max_drive_level
    paths = dict()
    for level in range(1, max_drive_level + 1):
        paths[level] = find_jump_paths(direct_distances, level)
    return paths

#
# Read
#

grid_pattern = re.compile(r'GRID (?P<x>[0-9]{2})(?P<y>[0-9]{2})')

CubeCoord = collections.namedtuple("CubeCoord", ["x", "z", "y"])
OffsetCoord = collections.namedtuple("OffsetCoord", ["x", "y"])
System = collections.namedtuple("System", ["name", "offset", "cube"])

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
    with open(path, "w") as f:
        json.dump(
            obj=obj,
            fp=f,
            ensure_ascii=False,
            sort_keys=True,
            indent=4,
        )

#def dump_graphml():
#    pass

def write_reports(output_dir, systems, direct_distances, paths):
    os.makedirs(output_dir, exist_ok=True)

    systems_file = os.path.join(output_dir, "systems.json")
    dump_json(systems, systems_file)

    direct_distances_file = os.path.join(output_dir, "direct_distances.json")
    dump_json(direct_distances, direct_distances_file)

    #paths_file = os.path.join(output_dir, "paths.json")
    #dump_json(paths, paths_file)

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
        paths = find_all_jump_paths(direct_distances, max_drive_level)
        # TODO calculate time costs by combining paths and direct_distances? Or can we get that from A* immediately?
        write_reports(output_dir, systems, direct_distances, paths)

def main():

    # TODO add subcommands? drive isn't always needed if tsv won't contain distance info (any readable way to encode that info in tsv?). Probably can just generate a directory of files?

    # TODO probably better to use a table rather than a graph for distance info output? ==> Can't show the route with a table, but could have alternative output mode to show the minimum distance that needs to be travelled between two systems for a particular spike drive level.

    # TODO is there any way to show all drive levels at once? ==> Color coding? Note: lower drive levels may not be able to get everywhere in the sector, higher drive levels may be able to take shorter paths

    # TODO need to include elapsed time information? The only time it isn't 6 days per jump is when jumping less than the maximum distance the spike drive can travel, ex: drive level 3 jumps 1 hex in (6*1)/3=2 days, 2 hexes in (6*2)/3=4 days, 3 hexes in (6*3)/3=6 days

    # TODO: note that the visualisation of a spike drive level >1 is there are more connections added between the nodes (Sectors), with different time weights attached to them (drive level =1, at most one connection between nodes, of six day length). Should be able to use standard shortest-path algos on this problem. Heuristic is point-to-point (single-hop, infinite drive level) distance (can precomputed easily)? ==> Admissiblity of that for A*?

    parser = argparse.ArgumentParser(description="Convert system data from a TiddlyWiki created by SWN Sector Generator into ship transit data.")
    parser.add_argument("-o", "--output-dir", help="Directory to write the output files into. Default: name portion of the input file")
    parser.add_argument("-m", "--max-drive-level", help="Maximum spike drive level. Default: 6")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")

    args = parser.parse_args()

    if args.output_dir is None:
        output_dir = os.path.splitext(os.path.basename(os.path.normpath(args.input)))[0]
    else:
        output_dir = args.output_dir

    process(args.input, output_dir, args.max_drive_level)

if __name__ == "__main__":
    main()
