// Hex math defined here: http://blog.ruslans.com/2011/02/hexagonal-grid-math.html

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

function HexagonGrid(canvasId, systems) {
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
    for (var system of systems) {
        var x = system[1][0];
        var y = system[1][1];
        var name = system[0];
        this.offset_model[x][y] = {
            "name": name,
        };
    }

    // Create model of path
    this.path_model = [];

    // Drawing setup
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext("2d");

    this.canvasOriginX = 0;
    this.canvasOriginY = 0;

    // Events
    //this.canvas.addEventListener("mousedown", this.clickEvent.bind(this), false);
};

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
    var offsetColumn = false;
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
                var path_index = this.path_model.indexOf(name)
                if (path_index === 0) {
                    color = "#B4D9EB";
                } else if (path_index !== -1) {
                    color = "#CCE7F4";
                } else {
                    color = "#E3F3FB";
                }
            }
            // TODO different colours for:
            // - nodes in path (including start and end)
            // - maybe special color for start of path
            // - reachable nodes from the head of the path

            var currentHexX;
            var currentHexY;
            if (offsetColumn) {
                currentHexX = x * this.side + this.canvasOriginX;
                currentHexY = (y * this.height) + this.canvasOriginY + (this.height * 0.5);
            } else {
                currentHexX = (x * this.side) + this.canvasOriginX;
                currentHexY = (y * this.height) + this.canvasOriginY;
            }

            this.drawHex(currentHexX, currentHexY, color, name, coordtext);
        }
        offsetColumn = !offsetColumn;
    }
    // TODO draw arrows between path nodes https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
};

HexagonGrid.prototype.drawHex = function(x0, y0, fillColor, name, coordtext) {
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

    // TODO scale font sizes based on width of hexes

    this.context.textAlign = "start";
    this.context.font = "normal normal 8px sans";
    this.context.fillStyle = "#333";
    this.context.fillText(coordtext, x0 + (this.width / 2) - (this.width/4), y0 + (this.height - 5));

    if (name !== null) {
        this.context.textAlign = "center";
        this.context.font = "normal bold 10px sans";
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

    return  { row: row, column: column };
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
    var mouseX = e.pageX;
    var mouseY = e.pageY;

    var localX = mouseX - this.canvasOriginX;
    var localY = mouseY - this.canvasOriginY;

    var tile = this.getSelectedTile(localX, localY);
    if (tile.column >= 0 && tile.row >= 0) {
        var drawy = tile.column % 2 == 0 ? (tile.row * this.height) + this.canvasOriginY + 6 : (tile.row * this.height) + this.canvasOriginY + 6 + (this.height / 2);
        var drawx = (tile.column * this.side) + this.canvasOriginX;

        this.drawHex(drawx, drawy - 6, "rgba(110,110,70,0.3)", "");
    } 
};
