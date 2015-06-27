#!/usr/bin/env python3

import argparse
import collections
import re
import string
import sys

#
# Read
#

grid_pattern = re.compile(r'GRID (?P<x>[0-9]{2})(?P<y>[0-9]{2})')

System = collections.namedtuple("System", ["name", "x", "y"])

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

            systems.append(System(
                name=name,
                x=x,
                y=y,
            ))

    return systems

#
# Write
#

def write_graphml(output, systems):
    # TODO actual implementation
    for system in systems:
        output.write(" ".join((str(e) for e in system)))
        output.write("\n")


#
# Main
#

def convert(input, output):
    # Open streams if required
    if input == "-":
        convert(sys.stdin, output)
    elif isinstance(input, str):
        with open(input, "r") as i:
            convert(i, output)
    elif output == "-":
        convert(input, sys.stdout)
    elif isinstance(output, str):
        with open(output, "w") as o:
            convert(input, o)

    # Do actual conversion
    else:
        systems = read_tiddlywiki(input)
        write_graphml(output, systems)

def main():
    parser = argparse.ArgumentParser(description="Convert location info from a TiddlyWiki created by SWN Sector Generator into graphml objects")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")
    parser.add_argument("output", help="graphml file to write. Use - for stdout.")

    args = parser.parse_args()

    convert(args.input, args.output)

if __name__ == "__main__":
    main()
