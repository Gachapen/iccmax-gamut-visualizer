(function(){
    var app = angular.module('iccmax-gamut', []);
    app.controller('AppController', ['$scope', function($scope) {
        var activeGamut = {
            vertices: [],
            faces: []
        }

        var readGamut = function(dv, index, size) {
            var numPcsChannels = dv.getUint16(index + 8);
            var numDeviceChannels = dv.getUint16(index + 10);
            var numVertices = dv.getUint32(index + 12);
            var numFaces = dv.getUint32(index + 16);

            console.log("PCS channels: " + numPcsChannels);
            console.log("Device channels: " + numDeviceChannels);
            console.log("Vertices: " + numVertices);
            console.log("Faces: " + numFaces);

            var gamut = {
                vertices: [],
                faces: [],
                channels: numPcsChannels
            };

            var faceIndex = index + 20;
            for (var i = 0; i < numFaces; ++i) {
                var face = new Array(3);
                face[0] = dv.getUint32(faceIndex);
                face[1] = dv.getUint32(faceIndex + 4);
                face[2] = dv.getUint32(faceIndex + 8);

                console.log("Face " + i + ": [" + face[0] + "," + face[1] + "," + face[2] + "]");

                gamut.faces.push(face);

                faceIndex = faceIndex + 12;
            }

            var vertexIndex = faceIndex;
            for (var i = 0; i < numVertices; ++i) {
                var vertex = new Array(numPcsChannels);
                for (var chanNum = 0; chanNum < numPcsChannels; ++chanNum) {
                    vertex[chanNum] = dv.getFloat32(vertexIndex + chanNum * 4);
                }

                var log = "Vertex " + i + ": [" + vertex[0];
                for (var chanNum = 1; chanNum < numPcsChannels; ++chanNum) {
                    log = log + "," + vertex[chanNum];
                }
                log = log + "]";
                console.log(log);

                gamut.vertices.push(vertex);

                vertexIndex = vertexIndex + 4 * numPcsChannels;
            }

            return gamut;
        }

        var readProfile = function(file) {
            fileReader = new FileReader();
            fileReader.onloadend = function() {
                var dv = new DataView(fileReader.result);

                var version = dv.getUint8(8);
                console.log("Profile version: " + version);

                if (version < 5) {
                    console.log("Version is required to be 5 or higher");
                    return false;
                }

                var tagTableIndex = 128;
                var tagCountIndex = tagTableIndex;

                var tagCount = dv.getUint32(tagCountIndex);
                console.log("Tag count: " + tagCount);

                var tagIndex = tagCountIndex + 4;
                for (var i = 0; i < tagCount; ++i) {
                    var sigIndex = tagIndex;
                    var signature = String.fromCharCode(
                        dv.getUint8(sigIndex),
                        dv.getUint8(sigIndex + 1),
                        dv.getUint8(sigIndex + 2),
                        dv.getUint8(sigIndex + 3));

                    var offsetIndex = sigIndex + 4;
                    var offset = dv.getUint32(offsetIndex);

                    var sizeIndex = offsetIndex + 4;
                    var size = dv.getUint32(sizeIndex);

                    console.log("Signature: " + signature);
                    console.log("Offset: " + offset);
                    console.log("Size: " + size);

                    if (signature == 'gbd0') {
                        activeGamut = readGamut(dv, offset, size);
                    }

                    tagIndex = tagIndex + 12;
                }
            }
            fileReader.readAsArrayBuffer(file);
        }

        var handleDragOver = function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            e.dataTransfer.dropEffect = 'copy';

            return false;
        };

        var handleFileDrop = function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }

            var files = e.dataTransfer.files;
            if (files.length > 0) {
                $scope.$apply(function() {
                    readProfile(files[0]);
                });
            }

            return false;
        };

        var uploadProfile = function() {
           var file = this.files[0];
           $scope.$apply(function() {
               readProfile(file);
           });
        }

        var loadShaderProgram = function(gl) {
            vertexShader = loadShader(gl, 'vshader');
            fragmentShader = loadShader(gl, 'fshader');

            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);

            var attribs = ['position', 'color'];
            for (var i = 0; i < attribs.length; ++i) {
                gl.bindAttribLocation(program, i, attribs[i]);
            }

            gl.linkProgram(program);

            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);

            var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (!linked && !gl.isContextLost()) {
                var error = gl.getProgramInfoLog(program);
                console.log("Error in program linking: " + error);

                gl.deleteProgram(program);

                return null;
            }

            return program;
        }

        var initializeGl = function() {
            var program = loadShaderProgram(gl);
            if (!program) {
                return;
            }

            gl.useProgram(program);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(10000);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        var resizeVisualizer = function() {
            if (renderCanvas.clientWidth == renderCanvas.width && renderCanvas.clientHeight == renderCanvas.height) {
                return;
            }

            renderCanvas.width = renderCanvas.clientWidth;
            renderCanvas.height = renderCanvas.clientHeight;

            gl.viewport(0, 0, renderCanvas.width, renderCanvas.height);
        }

        var renderVisualizer = function() {
            resizeVisualizer();

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        var visualizer = document.getElementById("visualizer");
        visualizer.addEventListener('dragover', handleDragOver, false);
        visualizer.addEventListener('drop', handleFileDrop, false);

        var profileUpload = document.getElementById("profile-upload");
        profileUpload.addEventListener('change', uploadProfile, false);

        var renderCanvas = document.getElementById("visualizer-canvas");
        var gl = WebGLUtils.setupWebGL(renderCanvas);
        if (!gl) {
            console.log("Error: Can't create WebGL context");
        }

        initializeGl();

        window.requestAnimationFrame(renderVisualizer);
    }]);
})();

/* vim: set ts=4 sw=4 expandtab: */
