// Thomas Milne-Jones
// tmlinejo
// 1396046
// lab
// 05/22/2015
// main.js
// displays a 3D model from a coor and poly file
// left clicking the model cycles between smooth and flat shading, right clicking cycles between orthographic and perspective views


/*
    texture map sphere
    map sphere to shark
    texture map shark
    rotate all points
    calculate vertex normals
    calculate diffuse lighting
    calculate specular lighting
    apply perspective
    draw points to buffer with triangles
*/

var inputCoor = SHARK_COORD
var inputPoly = SHARK_POLY

var viewDistance = 1
var eyeVector = normalize([1,1,1])
var lightSource = normalize([1,1,1])
var glossiness = 20

var img


var xdim = 100
var ydim = 100
var xmin = -2
var xmax = 1
var ymin = -1.75
var ymax = 1.25


var Rmax = 100;
var dx = (xmax - xmin) / (xdim - 1);
var dy = (ymax - ymin) / (ydim - 1);
var sx = 100;
var sy = 100;
var sz = 100;

var canvas;
var gl;



var maxNumVertices  = 1044484;
var index = 0;
var coordList = [];
var normalPointer = [];
var normalList = [];
var normalFinal = [];
var normalFlat = [];

var vertexShaderSource = "\
    attribute vec4 vPosition;  \n\
    attribute vec4 vColor;      \n\
    varying vec4 fColor;         \n\
    void main(void)                \n\
    {                                  \n\
      gl_Position = vPosition; \n\
      fColor = vColor;            \n\
    }                                  \n\
";
var fragmentShaderSource = "\
    precision mediump float;    \n\
    varying vec4 fColor;         \n\
    void main(void)                \n\
    {                                  \n\
      gl_FragColor = fColor;    \n\
    }                                  \n\
";

var vBuffer;
var vPosition;
var cBuffer;
var vColor;

window.onload = function init() {

    var coor = inputCoor;
    var poly = inputPoly;

    canvas = document.getElementById( "gl-canvas" );
    img = document.getElementByID("tigerimage")
    
    gl = canvas.getContext("experimental-webgl");    // sets up gl
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );// shows the canvas on the screen
    gl.clearColor( 0.0, 0.5, 0.0, 1.0 );  // sets the default background color

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, vertexShaderSource, fragmentShaderSource );
    gl.useProgram( program ); // runs the shader program
    
    
    // vertex buffers
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 12*maxNumVertices, gl.STATIC_DRAW);
    
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW);
    
    vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    // vertex buffers
    
    
    for(i=0; i<coor.length; i++) // rotate all points in coor file
        coor[i] = rotate(coor[i])
    
    for(i=0; i<coor.length; i++) // prepare normal gathering list
        normalList.push([[0,0,0]]);
    
    for(i=0; i<poly.length; i++) // construct triangle fans from poly file
    {
        normalList[poly[i][1]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1])); // collect normals for all polygons connected to a point
        normalList[poly[i][2]-1].push(getNormal(coor[poly[i][2]-1], coor[poly[i][3]-1], coor[poly[i][1]-1]));
        for(j=3; j<poly[i].length; j++)
        {
            coordList.push(coor[poly[i][1]-1]); // store all points to read into buffer later
            coordList.push(coor[poly[i][j-1]-1]);
            coordList.push(coor[poly[i][j]-1]);
            normalPointer.push(poly[i][1]-1); // remember which normal to associate with the point
            normalPointer.push(poly[i][2]-1);
            normalPointer.push(poly[i][j]-1);
            normalFlat.push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1])) // normals for flat shading
            normalFlat.push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1]))
            normalFlat.push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1]))
            normalList[poly[i][j]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][j-1]-1], coor[poly[i][j]-1])); // collect normals for all polygons connected to a point
        }
    }
    
    for(i=0; i<normalList.length; i++) // for each point, assemble collected smooth shading normals
    {
        var temp = [0, 0, 0];
        for(j=0; j<normalList[i].length; j++) // for each polygon next to this point, there will be a normal in the subarray
            for(k=0; k<=2; k++) // for each coordinate of the normal, add it to the sum
                temp[k] +=normalList[i][j][k];
        normalFinal.push(normalize(temp));
    } // assemble smooth normals

    
    // orthographic color picking setup
    for(i=0; i<coordList.length; i++) // load color picking render for orthographic
    {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(coordList[i])); 
        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(vec4(0.3, 0.2, 0.6, 1.0)));
        index++;
    }
    render();
    bytesPerPixel = 4
    var arraysize = canvas.width * canvas.height * bytesPerPixel; // load color picking triangles into buffer
    var pixelData = new Uint8Array(arraysize);
    gl.readPixels ( 0,0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    var orthoColorData = new Uint32Array ( pixelData.buffer); // orthographic color picking matrix
    // orthographic color picking setup
    
    
    // perspective color picking setup
    index = 0
    for(i=0; i<coordList.length; i++) // load color picking render for perspective
    {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[i]))); 
        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(vec4(0.3, 0.2, 0.6, 1.0))); // sharks are purple, right?
        index++;
    }
    render();
    bytesPerPixel = 4
    var arraysize = canvas.width * canvas.height * bytesPerPixel; // load color picking triangles into buffer
    var pixelData = new Uint8Array(arraysize);
    gl.readPixels ( 0,0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    var persColorData = new Uint32Array ( pixelData.buffer); // perspective color picking matrix
    // perspective color picking setup
    
    
    // load triangles for initial user view
    index = 0
    for(i=0; i<coordList.length; i++) // load smooth shading triangles into buffer
    {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(coordList[i])); 
        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(getColor(normalFinal[normalPointer[i]])));
        index++;
    }
    smoothFlag = 1 // set flags to keep track of view type selection
    perspectiveFlag = 1
    rerender(smoothFlag, perspectiveFlag);
    // render inital user view
    
    
    // set up click event listeners
    canvas.addEventListener("click", function(event) // left click event listener switches between smooth and flat shading
    {
        if(((4288230220==orthoColorData[((event.clientX-9) % canvas.width) + canvas.width*((2*canvas.height-event.clientY+14) % canvas.height)])&&perspectiveFlag==0)||((4288230220==persColorData[((event.clientX-9) % canvas.width) + canvas.width*((2*canvas.height-event.clientY+14) % canvas.height)])&&perspectiveFlag==1))
        {
            smoothFlag = (smoothFlag + 1) % 2 // switch between smooth and flat
            rerender(smoothFlag, perspectiveFlag) // load triangles and render
        }
    } );
    canvas.addEventListener('contextmenu', function(event) // right click event listener switches between perspective and orthographic view
    {
        event.preventDefault(); // prevent right click menu
        if(((4288230220==orthoColorData[((event.clientX-9) % canvas.width) + canvas.width*((2*canvas.height-event.clientY+14) % canvas.height)])&&perspectiveFlag==0)||((4288230220==persColorData[((event.clientX-9) % canvas.width) + canvas.width*((2*canvas.height-event.clientY+14) % canvas.height)])&&perspectiveFlag==1))
        {
            perspectiveFlag = (perspectiveFlag + 1) % 2 // switch between perspective and orthographic
            rerender(smoothFlag, perspectiveFlag) // load triangles and render
        }
    }); // set up click event listeners
    
    
} // main

function rerender(smoo, pers) // check smooth/flat and perspective/ortho and then load triangles and render
{
    index = 0
    for(i=0; i<coordList.length; i++)
    {
        if(pers)
            nextPoint = perspect(coordList[i]) // warp points to perspective if perspective flag is on
        else
            nextPoint = coordList[i] // display orthographic points if perspective flag is not on
        if(smoo)
            nextColor = getColor(normalFinal[normalPointer[i]]) // get smooth shading colors if smooth flag is on
        else
            nextColor = getFlatColor(normalFlat[i]) // get flat colors if smooth flag is not on 
        
        if (dot(normalFlat[i], [0,0,1]) >= 0) // only render triangles facing the camera
        {        // the hole in the shark's neck was there before I made this check, this is not the cause, but I have no idea what is
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(nextPoint));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
        }
    }
    render();
} // rerender

function getColor(normal) // calculates specular and smooth shading
{
    var halfwayVector = normalize([lightSource[0] + eyeVector[0], lightSource[1] + eyeVector[1], lightSource[2] + eyeVector[2]])
    var diffuse = 1*1*dot(normal, lightSource)
    var specular = 1*Math.pow(dot(normal, halfwayVector), glossiness)
    return vec4(diffuse+specular, diffuse+specular, diffuse+specular, 1.0)
} // getColor

function getFlatColor(normal) // calculates flat shading
{
    var diffuse = 1*1*dot(normal, lightSource)
    return vec4(diffuse, diffuse, diffuse, 1.0)
} // getFlatColor


function getNormal(pA, pB, pC) // calculates the normal of a given triangle
{
    var edge1 = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
    var edge2 = [pC[0] - pA[0], pC[1] - pA[1], pC[2] - pA[2]];
    output = normalize(cross(edge1, edge2));
    return output
} // getNormal

function rotate(point) // rotate to viewport
{
    var x = point[0]/sx; // scaling
    var y = point[1]/sy;
    var z = point[2]/sz;
    var vx = Math.sqrt(1/2)*(x+z);  // rotation to viewport
    var vy = Math.sqrt(1/6)*((2*y)+x-z);
    var vz = Math.sqrt(1/3)*(-x+y+z);
    return vec3(vx, vy, vz)
} // rotate

function perspect(point) // verbing things is fun
{
    var x = point[0]
    var y = point[1]
    var z = point[2]
    distance = Math.sqrt(Math.pow(x-(eyeVector[0]*viewDistance), 2) + Math.pow(y-(eyeVector[1]*viewDistance), 2) + Math.pow(z-(eyeVector[2]*viewDistance), 2))
    x = x * distance
    y = y * distance
    z = z * distance
    return [x, y, z]
} // perspect


function render() // draws stuff on the screen
{
    gl.clearDepth(0.0)
    gl.depthFunc(gl.GREATER)
    gl.enable(gl.DEPTH_TEST)
    gl.clear( gl.COLOR_BUFFER_BIT |gl.DEPTH_BUFFER_BIT ); // colors the background
    gl.drawArrays( gl.TRIANGLES, 0, index ); // draws the lines
} // render
