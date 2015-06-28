# SWN Transit Map

Create ship transit data within a Stars Without Number sector.

## Basic Usage

### Prerequisites

- Python 3.3+
  - Beautiful Soup 4
- A TiddlyWiki created by the SWN Sector Generator
- The level of the ship's spike drive

### Example

This command will write the transit data (for a level 3 spike drive in the Asgard Sigma sector) to stdout in tab-seperated-values format

    $ ./transit.py 3 asgard_sigma.html -

## References

- [Hexagonal Grids](http://www.redblobgames.com/grids/hexagons/) by Red Blob Games
- [SWN Free Edition](http://www.drivethrurpg.com/product/86467/Stars-Without-Number-Free-Edition) by Sine Nomine Publishing

## License

The content of this repository is released under the ASL v2.0 as provided in the LICENSE file that accompanied this code.

By submitting a "pull request" or otherwise contributing to this repository, you agree to license your contribution under the license mentioned above.
