#!/usr/bin/env python3

import argparse
import collections
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

def write_tsv(output, systems):
    # TODO yaml a better option?
    for system in systems:
        prefix = ""
        for e in system:
            output.write(prefix)
            prefix = "\t"

            if isinstance(e, tuple):
                output.write(",".join(str(p) for p in e))
            else:
                output.write(str(e))
        output.write("\n")

#def write_graphml():
#    pass

#
# Main
#

def convert(input, output, drive_level, output_func):
    # Open streams if required
    if input == "-":
        convert(sys.stdin, output, drive_level, output_func)
    elif isinstance(input, str):
        with open(input, "r") as i:
            convert(i, output, drive_level, output_func)
    elif output == "-":
        convert(input, sys.stdout, drive_level, output_func)
    elif isinstance(output, str):
        with open(output, "w") as o:
            convert(input, o, drive_level, output_func)

    # Do actual conversion
    else:
        systems = read_tiddlywiki(input)
        output_func(output, systems)

def main():
    output_fmts = {n[6:]: f for n,f in globals().items() if n.startswith("write_")}

    # TODO add subcommands? drive isn't always needed if tsv won't contain distance info (any readable way to encode that info in tsv?). Probably can just generate a directory of files?

    # TODO probably better to use a table rather than a graph for distance info output? ==> Can't show the route with a table, but could have alternative output mode to show the minimum distance that needs to be travelled between two systems for a particular spike drive level.

    # TODO is there any way to show all drive levels at once? ==> Color coding? Note: lower drive levels may not be able to get everywhere in the sector, higher drive levels may be able to take shorter paths

    # TODO need to include elapsed time information? The only time it isn't 6 days per jump is when jumping less than the maximum distance the spike drive can travel, ex: drive level 3 jumps 1 hex in (6*1)/3=2 days, 2 hexes in (6*2)/3=4 days, 3 hexes in (6*3)/3=6 days

    # TODO: note that the visualisation of a spike drive level >1 is there are more connections added between the nodes (Sectors), with different time weights attached to them (drive level =1, at most one connection between nodes, of six day length). Should be able to use standard shortest-path algos on this problem. Heuristic is point-to-point (single-hop, infinite drive level) distance (can precomputed easily)? ==> Admissiblity of that for A*?

    parser = argparse.ArgumentParser(description="Convert system data from a TiddlyWiki created by SWN Sector Generator into ship transit data.")
    parser.add_argument("-o", "--output-format", default="tsv", choices=sorted(output_fmts), help="Format to use for the output. Default: tsv")
    parser.add_argument("drive", type=int, choices=range(1,6+1), help="Starship drive level.")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")
    parser.add_argument("output", help="graphml file to write. Use - for stdout.")

    args = parser.parse_args()

    convert(args.input, args.output, args.drive, output_fmts[args.output_format])

if __name__ == "__main__":
    main()
