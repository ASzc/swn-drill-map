/*
 * This file was derived from Hexagon.js by Robert Anton Reese.
 * The original Copyright statement follows:
 *
 * The MIT License
 *
 * Copyright (c) 2012-2013 Robert Anton Reese
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

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
// Init
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
    this.drive_level = 1;
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
    window.addEventListener("keyup", this.keyEvent.bind(this));
    window.addEventListener("hashchange", this.hashEvent.bind(this));
    this.lastSetHash == "";
    this.readHash();
    this.writeHash();
};

//
// Common
//

HexagonGrid.prototype.getAvailablePaths = function() {
    return this.paths[this.drive_level.toString()];
}

//
// Event Handlers
//

HexagonGrid.prototype.hashEvent = function(e) {
    this.readHash();
    this.writeHash();
    this.redraw();
}

HexagonGrid.prototype.keyEvent = function(e) {
    var key = e.keyCode || e.which;
    var keyChar = String.fromCharCode(key);
    if (keyChar === "c" || keyChar === "C") {
        this.path_model = [];
        this.writeHash();
        this.redraw();
    } else {
        var number = parseInt(keyChar, 10);
        if (number >= 1 && number <= 6) {
            this.drive_level = number;
            this.writeHash();
            this.redraw();
        }
    }
}

HexagonGrid.prototype.clickEvent = function(e) {
    if (e.button === 0) {
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        var localX = mouseX - this.canvasOriginX;
        var localY = mouseY - this.canvasOriginY;

        var tile = this.getSelectedTile(localX, localY);
        if (tile.x >= 0 && tile.y >= 0 && tile.x < this.max_x && tile.y < this.max_y) {
            var hex = this.offset_model[tile.x][tile.y];
            if (hex !== null) {
                var availablePaths = this.getAvailablePaths();
                var name = hex["name"];
                // Add to path only if no existing nodes in the path or if this node is reachable from the path head
                var path_index = this.path_model.indexOf(name);
                if (path_index === -1) {
                    if (this.path_model.length === 0 || availablePaths[this.path_model[0]][name] !== null) {
                        this.path_model.push(name);
                    }
                // Always allow removal of a node in the path
                } else {
                    this.path_model.splice(path_index, 1);
                }
                this.writeHash();
                this.redraw();
            }
        }
    }
}

//
// URL Fragment / Location Hash
//

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
                var availablePaths = this.getAvailablePaths();
                var path_candidate = h.substring(sepIndex + 1);
                if (path_candidate.length > 0) {
                    var path = path_candidate.split(",");
                    var pathOk = true;
                    for (var name of path) {
                        if (!(name in this.system_coords) || availablePaths[path[0]][name] === null) {
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

//
// Canvas Drawing
//

// Colour scheme: http://paletton.com/#uid=53s0u0kaVz84jP27qHbeJtFiHpX

HexagonGrid.prototype.redraw = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fit the hex size to the smallest of the canvas dimensions
    var height_candidate = this.canvas.height / (this.max_y + 0.5);
    radius = height_candidate / Math.sqrt(3);
    this.width = 2 * radius;
    this.height = height_candidate;
    this.side = (3 / 2) * radius;

    // Draw hexes using the model
    var availablePaths = this.getAvailablePaths();
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
                        color = "#5BC1F2";
                    // Is current reachable from head?
                    } else if (availablePaths[path_head_name][name] !== null) {
                        // Is current in the path?
                        var path_index = this.path_model.indexOf(name);
                        if (path_index !== -1) {
                            color = "#5BC1F2";
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
    // Split into subparts (actual jumps) using node list in availablePaths
    for (var i = 0; i < pathParts.length; i++) {
        var subParts = [];
        var jump = availablePaths[pathParts[i].from][pathParts[i].to];
        // Don't draw path if route is invalid at current drive level
        if (jump === null) {
            return;
        }
        var jumpNodes = availablePaths[pathParts[i].from][pathParts[i].to][0];

        prev_node = null;
        for (node of jumpNodes) {
            if (prev_node !== null) {
                subParts.push({from: prev_node, to: node});
            }
            prev_node = node;
        }

        pathParts[i] = subParts;
    }

    // Draw arrows using the model and pre-processed array
    var arrowHeadLen = 0.22 * this.width;
    this.context.lineWidth = (0.10 * this.width);
    this.context.lineCap = "round";
    var strokeStyles = [
        "rgba(61, 147, 99, 0.75)",
        "rgba(70, 79, 142, 0.75)",
        "rgba(207, 151, 86, 0.75)",
        "rgba(125, 189, 153, 0.75)",
        "rgba(129, 135, 183, 0.75)",
        "rgba(255, 215, 168, 0.75)"
    ]
    var strokeStyleIndex = 0;

    var lastJumpCost = 0;
    var totalCost = 0;
    var visitedParts = {};

    // Config for costs text
    var textSize = 0.10 * this.width;
    this.context.font = "normal bold " + textSize.toString() + "px sans";
    this.context.fillStyle = "#000";

    for (part of pathParts) {
        // Load arrow style
        this.context.strokeStyle = strokeStyles[strokeStyleIndex];

        for (subpart of part) {
            // Determine the model and view coordinates of the hex
            var fromC = this.system_coords[subpart.from];
            var toC = this.system_coords[subpart.to];
            var fromV = this.toViewCoords(fromC.x, fromC.y);
            var toV = this.toViewCoords(toC.x, toC.y);

            // Draw path arrow
            this.drawArrow(
                this.hexXLoc(fromV.x, "center"),
                this.hexYLoc(fromV.y, "center"),
                this.hexXLoc(toV.x, "center"),
                this.hexYLoc(toV.y, "center"),
                arrowHeadLen
            );

            // Process costs
            lastJumpCost = availablePaths[subpart.from][subpart.to][1];
            totalCost += lastJumpCost;

            // Try to avoid overwriting cost text when paths loop back
            var textOffset = 0;
            if (subpart.to in visitedParts) {
                textOffset = visitedParts[subpart.to] * textSize;
                visitedParts[subpart.to] += 1;
            } else {
                visitedParts[subpart.to] = 1;
            }

            // Draw costs
            this.context.textAlign = "right";
            this.context.fillText(lastJumpCost, this.hexXLoc(toV.x, "right"), this.hexYLoc(toV.y, "top") + textOffset);
            this.context.textAlign = "left";
            this.context.fillText(totalCost, this.hexXLoc(toV.x, "left"), this.hexYLoc(toV.y, "top") + textOffset);
        }

        // Select next arrow style, cycled at the number of styles
        strokeStyleIndex = (strokeStyleIndex + 1) % strokeStyles.length;
    }
};

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

    this.context.textAlign = "left";
    this.context.font = "normal normal " + (0.10 * this.width).toString() + "px sans";
    this.context.fillStyle = "#333";
    this.context.fillText(coordtext, this.hexXLoc(x0, "left"), this.hexYLoc(y0, "bottom"));

    if (name !== null) {
        this.context.textAlign = "center";
        this.context.font = "normal bold " + (0.11 * this.width).toString() + "px sans";
        this.context.fillStyle = "#000";
        this.context.fillText(name, this.hexXLoc(x0, "center"), this.hexYLoc(y0, "center"));
    }
}

//
// View and Hex Math
//

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

HexagonGrid.prototype.hexXLoc = function(hexViewX, locationName) {
    if (locationName === "left") {
        return hexViewX + (this.width / 2) - (this.width / 4);
    } else if (locationName === "right") {
        return hexViewX + (this.width / 2) + (this.width / 4);
    } else if (locationName === "center") {
        return hexViewX + (this.width / 2);
    } else {
        return hexViewX;
    }
}

HexagonGrid.prototype.hexYLoc = function(hexViewY, locationName) {
    if (locationName === "top") {
        return hexViewY + (0.12 * this.height);
    } else if (locationName === "bottom") {
        return hexViewY + (this.height - (0.05 * this.height));
    } else if (locationName === "center") {
        return hexViewY + (this.height / 2);
    } else {
        return hexViewY;
    }
}

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
}

HexagonGrid.prototype.sign = function(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

HexagonGrid.prototype.isPointInTriangle = function isPointInTriangle(pt, v1, v2, v3) {
    var b1, b2, b3;

    b1 = this.sign(pt, v1, v2) < 0.0;
    b2 = this.sign(pt, v2, v3) < 0.0;
    b3 = this.sign(pt, v3, v1) < 0.0;

    return ((b1 == b2) && (b2 == b3));
}
