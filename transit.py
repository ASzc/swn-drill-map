#!/usr/bin/env python3

import argparse
import collections
import string
import sys

System = collections.namedtuple("System", ["name", "hex_number"])

def read_tiddlywiki(input):
    import bs4

    systems = []

    soup = bs4.BeautifulSoup(input)
    for d in soup.find_all("div"):
        if "title" in d.attrs and d.attrs["title"].startswith("System:"):
            systems.append(System(
                name=string.capwords(d.attrs["title"][7:]),
                =,
            ))

    return systems


def write_graphml(output, systems):
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
    parser = argparse.ArgumentParser(description="Convert location info from a SWN SecGen created TiddlyWiki into graphml objects")
    parser.add_argument("input", help="TiddlyWiki html to read. Use - for stdin.")
    parser.add_argument("output", help="graphml file to write. Use - for stdout.")

    args = parser.parse_args()

    convert(args.input, args.output)

if __name__ == "__main__":
    main()
