# SWN Transit Map

Find ship transit data within a Stars Without Number sector.

## Basic Usage

### Prerequisites

- Python 3.3+
  - Beautiful Soup 4
- A TiddlyWiki created by the SWN Sector Generator

### Example

This command will write the transit data (for the Asgard Sigma sector) into files within the directory `asgard_sigma`.

    $ ./transit.py asgard_sigma.html

### Output files

- `systems.json`: JSON array of
  - System Name
  - Offset Coordinates
  - Cube Coordinates
- `direct_distances.json`: JSON object of
  - System Name
  - Distances to every System if a single jump were possible

## References

- [Hexagonal Grids](http://www.redblobgames.com/grids/hexagons/) by Red Blob Games
- [SWN Free Edition](http://www.drivethrurpg.com/product/86467/Stars-Without-Number-Free-Edition) by Sine Nomine Publishing

## License

The content of this repository is released under the ASL v2.0 as provided in the LICENSE file that accompanied this code.

By submitting a "pull request" or otherwise contributing to this repository, you agree to license your contribution under the license mentioned above.
