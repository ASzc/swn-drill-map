# SWN Transit Map

Find ship transit data within a Stars Without Number sector.

## Basic Usage

### Prerequisites

- Python 3.3+
  - Beautiful Soup 4
  - Optional: PyYAML
- A TiddlyWiki created by the SWN Sector Generator

### Example

This command will write the transit data (for the Asgard Sigma sector) into files within the directory `asgard_sigma`.

    $ ./transit.py asgard_sigma.html

### Output files

Data structures may be written in both json and yaml format. If you don't have PyYAML installed, only json will be written.

- `systems`:
  - System Name
  - Offset Coordinates
  - Cube Coordinates
- `hex_distances`:
  - System Name
    - Hex Distances to every System
- `paths`:
  - Spike Drive Level
    - Start System Name
      - End System Name
        - null if not reachable **OR**
        - list of systems in the path
        - time cost (in days)

## References

- [Hexagonal Grids](http://www.redblobgames.com/grids/hexagons/) by Red Blob Games
- [SWN Free Edition](http://www.drivethrurpg.com/product/86467/Stars-Without-Number-Free-Edition) by Sine Nomine Publishing

## License

The content of this repository is released under the ASL v2.0 as provided in the LICENSE file that accompanied this code.

By submitting a "pull request" or otherwise contributing to this repository, you agree to license your contribution under the license mentioned above.
