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

                gamut.faces.push(face);

                faceIndex = faceIndex + 12;
            }

            var vertexIndex = faceIndex;
            for (var i = 0; i < numFaces; ++i) {
                var vertex = new Array(numPcsChannels);
                for (var j = 0; j < numPcsChannels; ++i) {
                    vertex[j] = dv.getFloat32(vertexIndex + i * 4);
                }

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

                    if (signature == 'gbd ') {
                        activeGamut = readGamut(dv, offset, size);
                    }

                    tagIndex = tagIndex + 12;
                }
            }
            fileReader.readAsArrayBuffer(file);
        }

        var renderCanvas = document.getElementById("visualizer-canvas");
        var gl = renderCanvas.getContext("webgl") || renderCanvas.getContext('experimental-webgl');
        if (!gl) {
            console.log("Error: Can't create WebGL context");
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        gl.viewport(0, 0, renderCanvas.width, renderCanvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

        var visualizer = document.getElementById("visualizer");
        visualizer.addEventListener('dragover', handleDragOver, false);
        visualizer.addEventListener('drop', handleFileDrop, false);

        var uploadProfile = function() {
           var file = this.files[0];
           $scope.$apply(function() {
               readProfile(file);
           });
        }

        var profileUpload = document.getElementById("profile-upload");
        profileUpload.addEventListener('change', uploadProfile, false);
    }]);
})();

/* vim: set ts=4 sw=4 expandtab: */
