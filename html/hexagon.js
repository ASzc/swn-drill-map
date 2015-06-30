// Hex math defined here: http://blog.ruslans.com/2011/02/hexagonal-grid-math.html
// Colour scheme: http://paletton.com/#uid=53s0u0kaVz84jP27qHbeJtFiHpX

//
// Utility
//

String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}

//
// Hexagon Grid
//

function HexagonGrid(canvasId, systems, paths) {
    // Find the maximum extents of the system offset coordinates
    this.max_x = 0;
    this.max_y = 0;
    for (var system of systems) {
        var x = system[1][0];
        if (x > this.max_x) {
            this.max_x = x;
        }
        var y = system[1][1];
        if (y > this.max_y) {
            this.max_y = y;
        }
    }
    this.max_x++;
    this.max_y++;

    // Create model of blank hexes
    this.offset_model = new Array(this.max_x);
    for (var x = 0; x < this.max_x; x++) {
        this.offset_model[x] = new Array(this.max_y);
        for (var y = 0; y < this.max_y; y++) {
            this.offset_model[x][y] = null;
        }
    }

    // Populate model of hex grid with systems
    this.system_coords = {};
    for (var system of systems) {
        var x = system[1][0];
        var y = system[1][1];
        var name = system[0];
        this.offset_model[x][y] = {
            "name": name,
        };
        this.system_coords[name] = {x: x, y: y};
    }

    // Create model of path
    this.drive_level = 1; // TODO need to be able to change this through UI
    this.paths = paths;
    this.path_model = [];

    // Drawing setup
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext("2d");

    this.canvasOriginX = 0;
    this.canvasOriginY = 0;

    this.oddColsHigh = true;

    // Events
    this.canvas.addEventListener("click", this.clickEvent.bind(this));
    window.addEventListener("hashchange", this.hashEvent.bind(this));
    this.lastSetHash == "";
    this.readHash();
    this.writeHash();
};

HexagonGrid.prototype.hashEvent = function(e) {
    this.readHash();
    this.writeHash();
    this.redraw();
}

HexagonGrid.prototype.readHash = function() {
    // Avoid reparsing a hash that was just written by writeHash()
    var h = location.hash;
    if (this.lastSetHash !== h) {
        // Read level
        if (h.indexOf("#") === 0) {
            var sepIndex = h.indexOf(";");
            if (sepIndex !== -1) {
                var level_candidate = h.substring(1, sepIndex);
                if (level_candidate.length > 0) {
                    var level = parseInt(level_candidate, 10);
                    if (level.toString() in this.paths) {
                        this.drive_level = level;
                    }
                }
                // Read path
                var available_paths = this.paths[this.drive_level.toString()];
                var path_candidate = h.substring(sepIndex + 1);
                if (path_candidate.length > 0) {
                    var path = path_candidate.split(",");
                    var pathOk = true;
                    for (var name of path) {
                        if (!(name in this.system_coords) || available_paths[path[0]][name] === null) {
                            pathOk = false;
                            break;
                        }
                    }
                    if (pathOk) {
                        this.path_model = path;
                    }
                }
            }
        }
    }
}

HexagonGrid.prototype.writeHash = function() {
    var newHash = "#" + this.drive_level + ";" + this.path_model.join(",");

    this.lastSetHash = newHash;
    location.hash = newHash;
}

//HexagonGrid.prototype.drawHexGrid = function (rows, cols, originX, originY, isDebug) {
HexagonGrid.prototype.redraw = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fit the hex size to the smallest of the canvas dimensions
    var width_candidate = this.canvas.width / (this.max_x + 0.5);
    var height_candidate = this.canvas.height / (this.max_y + 0.5);
    var radius;
    if (width_candidate <= height_candidate) {
        radius = width_candidate / 2;
        this.width = width_candidate;
        this.height = Math.sqrt(3) * radius;
    } else {
        radius = height_candidate / Math.sqrt(3);
        this.width = 2 * radius;
        this.height = height_candidate;
    }
    this.side = (3 / 2) * radius;

    // Draw hexes using the model
    var available_paths = this.paths[this.drive_level.toString()];
    for (var x = 0; x < this.max_x; x++) {
        for (var y = 0; y < this.max_y; y++) {
            var coordtext = x.toString().lpad("0", 2) + y.toString().lpad("0", 2);

            var hex = this.offset_model[x][y];
            var color;
            var name;
            if (hex === null) {
                name = null;
                color = "#fff";
            } else {
                name = hex["name"];
                if (this.path_model.length > 0) {
                    var path_head_name = this.path_model[0];

                    // Is current the head?
                    if (name === path_head_name) {
                        color = "#E3F3FB";
                    // Is current reachable from head?
                    } else if (available_paths[path_head_name][name] !== null) {
                        // Is current in the path?
                        var path_index = this.path_model.indexOf(name);
                        if (path_index !== -1) {
                            color = "#E3F3FB";
                        } else {
                            color = "#CCE7F4";
                        }
                    } else {
                        color = "#eee";
                    }
                } else {
                    color = "#CCE7F4";
                }
            }

            viewCoords = this.toViewCoords(x, y);

            this.drawHex(viewCoords.x, viewCoords.y, color, name, coordtext);
        }
    }

    // Pre-process parts of the path into an array of A->B
    var pathParts = [];
    var prev_node = null;
    for (node of this.path_model) {
        if (prev_node !== null) {
            pathParts.push({from: prev_node, to: node});
        }
        prev_node = node;
    }
    // Split into subparts (actual jumps) using node list in available_paths
    for (var i = 0; i < pathParts.length; i++) {
        var subParts = [];
        var jumpNodes = available_paths[pathParts[i].from][pathParts[i].to][0]

        prev_node = null;
        for (node of jumpNodes) {
            if (prev_node !== null) {
                subParts.push({from: prev_node, to: node});
            }
            prev_node = node;
        }

        pathParts[i] = subParts;
    }

    // TODO need to display total cost ==> at destination hex (in the top-left of the hex, could display a total for every hex in the path that way)?
    // TODO need to break path A->B nodes into the jump nodes given by lookup in available_paths (paths.json)
    // TODO need to display cost per jump, can look up one-hop segment cost in available_paths as well ==> display in top-right of hex?

    // Draw arrows using the model and pre-processed array
    this.context.lineWidth = (0.10 * this.width);
    this.context.lineCap = "round";
    // TODO cycle color for each group of jump nodes (User says A->B->C, A->B needs two jumps, those are one colour. B->C needs more jumps, those are a different color)
    var strokeStyles = [
        "rgba(61, 147, 99, 0.75)",
        "rgba(70, 79, 142, 0.75)",
        "rgba(91, 169, 125, 0.75)",
        "rgba(98, 105, 163, 0.75)",
        "rgba(125, 189, 153, 0.75)",
        "rgba(129, 135, 183, 0.75)"
    ]
    var strokeStyleIndex = 0;
    for (part of pathParts) {
        this.context.strokeStyle = strokeStyles[strokeStyleIndex];

        for (subpart of part) {
            var fromC = this.system_coords[subpart.from];
            var toC = this.system_coords[subpart.to];

            var fromV = this.toViewCoords(fromC.x, fromC.y);
            var toV = this.toViewCoords(toC.x, toC.y);

            this.drawArrow(
                fromV.x + (this.width / 2),
                fromV.y + (this.height / 2),
                toV.x + (this.width / 2),
                toV.y + (this.height / 2),
                (0.22 * this.width)
            );
        }

        strokeStyleIndex = (strokeStyleIndex + 1) % strokeStyles.length;
    }
};

HexagonGrid.prototype.toViewCoords = function(x, y) {
    // Row is offset when:
    // - x is even and odd columns are high
    // - x is odd and even columns are high
    var xIsEven = ((x + 1) % 2) === 0;
    var offsetColumn = (xIsEven && this.oddColsHigh) || (!xIsEven && !this.oddColsHigh);

    var viewX = (x * this.side) + this.canvasOriginX;
    var viewY = (y * this.height) + this.canvasOriginY;
    if (offsetColumn) {
        viewY += this.height * 0.5;
    }

    return {x: viewX, y: viewY};
}

// http://stackoverflow.com/a/6333775
HexagonGrid.prototype.drawArrow = function(fromx, fromy, tox, toy, headlen) {
    this.context.beginPath();

    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    this.context.moveTo(fromx, fromy);
    this.context.lineTo(tox, toy);
    this.context.moveTo(tox, toy);
    this.context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6),
                        toy - headlen * Math.sin(angle - Math.PI / 6));
    this.context.moveTo(tox, toy);
    this.context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6),
                        toy - headlen * Math.sin(angle + Math.PI / 6));
    this.context.moveTo(tox, toy);

    this.context.closePath();
    this.context.stroke();
}

HexagonGrid.prototype.drawHex = function(x0, y0, fillColor, name, coordtext) {
    this.context.lineWidth = 1.0;
    this.context.lineCap = "butt";
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    this.context.moveTo(x0 + this.width - this.side, y0);
    this.context.lineTo(x0 + this.side, y0);
    this.context.lineTo(x0 + this.width, y0 + (this.height / 2));
    this.context.lineTo(x0 + this.side, y0 + this.height);
    this.context.lineTo(x0 + this.width - this.side, y0 + this.height);
    this.context.lineTo(x0, y0 + (this.height / 2));

    this.context.fillStyle = fillColor;
    this.context.fill();

    this.context.closePath();
    this.context.stroke();

    this.context.textAlign = "start";
    this.context.font = "normal normal " + (0.10 * this.width).toString() + "px sans";
    this.context.fillStyle = "#333";
    this.context.fillText(coordtext, x0 + (this.width / 2) - (this.width/4), y0 + (this.height - 5));

    if (name !== null) {
        this.context.textAlign = "center";
        this.context.font = "normal bold " + (0.11 * this.width).toString() + "px sans";
        this.context.fillStyle = "#000";
        this.context.fillText(name, x0 + (this.width/2), y0 + (this.height / 2));
    }
};

//Recusivly step up to the body to calculate canvas offset.
HexagonGrid.prototype.getRelativeCanvasOffset = function() {
	var x = 0, y = 0;
	var layoutElement = this.canvas;
    if (layoutElement.offsetParent) {
        do {
            x += layoutElement.offsetLeft;
            y += layoutElement.offsetTop;
        } while (layoutElement = layoutElement.offsetParent);
        
        return { x: x, y: y };
    }
}

//Uses a grid overlay algorithm to determine hexagon location
//Left edge of grid has a test to acuratly determin correct hex
HexagonGrid.prototype.getSelectedTile = function(mouseX, mouseY) {

	var offSet = this.getRelativeCanvasOffset();

    mouseX -= offSet.x;
    mouseY -= offSet.y;

    var column = Math.floor((mouseX) / this.side);
    var row = Math.floor(
        column % 2 == 0
            ? Math.floor((mouseY) / this.height)
            : Math.floor(((mouseY + (this.height * 0.5)) / this.height)) - 1);


    //Test if on left side of frame            
    if (mouseX > (column * this.side) && mouseX < (column * this.side) + this.width - this.side) {


        //Now test which of the two triangles we are in 
        //Top left triangle points
        var p1 = new Object();
        p1.x = column * this.side;
        p1.y = column % 2 == 0
            ? row * this.height
            : (row * this.height) + (this.height / 2);

        var p2 = new Object();
        p2.x = p1.x;
        p2.y = p1.y + (this.height / 2);

        var p3 = new Object();
        p3.x = p1.x + this.width - this.side;
        p3.y = p1.y;

        var mousePoint = new Object();
        mousePoint.x = mouseX;
        mousePoint.y = mouseY;

        if (this.isPointInTriangle(mousePoint, p1, p2, p3)) {
            column--;

            if (column % 2 != 0) {
                row--;
            }
        }

        //Bottom left triangle points
        var p4 = new Object();
        p4 = p2;

        var p5 = new Object();
        p5.x = p4.x;
        p5.y = p4.y + (this.height / 2);

        var p6 = new Object();
        p6.x = p5.x + (this.width - this.side);
        p6.y = p5.y;

        if (this.isPointInTriangle(mousePoint, p4, p5, p6)) {
            column--;

            if (column % 2 == 0) {
                row++;
            }
        }
    }

    return  { y: row, x: column };
};


HexagonGrid.prototype.sign = function(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};

//TODO: Replace with optimized barycentric coordinate method
HexagonGrid.prototype.isPointInTriangle = function isPointInTriangle(pt, v1, v2, v3) {
    var b1, b2, b3;

    b1 = this.sign(pt, v1, v2) < 0.0;
    b2 = this.sign(pt, v2, v3) < 0.0;
    b3 = this.sign(pt, v3, v1) < 0.0;

    return ((b1 == b2) && (b2 == b3));
};

HexagonGrid.prototype.clickEvent = function (e) {
    if (e.button === 0) {
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        var localX = mouseX - this.canvasOriginX;
        var localY = mouseY - this.canvasOriginY;

        var tile = this.getSelectedTile(localX, localY);
        if (tile.x >= 0 && tile.y >= 0 && tile.x < this.max_x && tile.y < this.max_y) {
            var hex = this.offset_model[tile.x][tile.y];
            if (hex !== null) {
                var name = hex["name"];
                // TODO add to path only if no existing nodes in the path or if this node is reachable from the path head
                var path_index = this.path_model.indexOf(name);
                if (path_index === -1) {
                    this.path_model.push(name);
                } else {
                    this.path_model.splice(path_index, 1);
                }
                this.writeHash();
                this.redraw();
            }
        }
    }
};
