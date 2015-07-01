# SWN Transit Map

Find ship transit data within a Stars Without Number sector.

*Congratulations on purchasing your RSNav Mark I navigation computer from Richardson Scientific (Astronautics Division). We are confident that it will give you many drills of fine service. For installation and calibration please see page 9. For the user guide, please see page 2306.*

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

#### HTML5 Canvas Application

An interactive map will be written to `map.html`, it can be used with any modern browser supporting HTML5 and Javascript.

##### Interface

The displayed hex grid contains:

- coordinates for each hex (bottom-left corner, formatted `XXYY`)
- if the hex contains a star system, the system name (centre)
- if a path is plotted, and the hex is on the path:
    - the number of days in the previous path segment (top-right corner)
    - the total number of days from the head of the path (top-left corner)

Hexes without a star system have a white fill. Occupied hexes will always have a colour, but which colour depends on their state:

- Reachable systems (any system if no path has yet been started) will be filled with pastel blue
- Non-reachable systems (systems that cannot be accessed due to spike drive limitations, relative to the head of the path) will be filled with grey
- Systems that are included in the path have a saturated blue fill

You may toggle reachable systems in and out of the path. Non-reachable systems cannot be added to the path.

When a path is plotted (more than one system in the path), coloured arrows will be drawn between the path systems, split into individual jumps as required by the spike drive level. The plotted path is an optimally short path (smallest number of jumps) between each system; other equally optimal paths may be possible.

##### Controls

| Input               | Effect            |
|:--------------------|:------------------|
| Mouse `Primary`     | Toggle path hexes |
| Keyboard `c`        | Clear path |
| Keyboard `1` to `6` | Set spike drive level |

##### Linkability

Drive level and the current path are stored in the fragment portion of the page URL, so you can send the current display to a someone else, or bookmark it.

This also means that the back and forward functionality of most browsers functions as undo and redo.

##### Demonstration

- Spike Drive Level 1: [Vahdat to Eneka](TODO/asgard_sigma/map.html#1;Vahdat,Eneka)
- Spike Drive Level 2: [Franco to Gunnhild to Protagoras](TODO/asgard_sigma/map.html#2;Franco,Gunnhild,Protagoras)
- Spike Drive Level 3: [Franco to Gunnhild to Protagoras](TODO/asgard_sigma/map.html#3;Franco,Gunnhild,Protagoras)

#### Serialized data

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
