(function(){
    var app = angular.module('iccmax-gamut', []);
    app.controller('AppController', ['$scope', function($scope) {
        var activeGamut = {
            numPcsChannels: 2,
            pcsSpace: '    ',
            vertices: [],
            faces: []
        }

        var getGamutMockData = function() {
            return {
                numPcsChannels: 3,
                pcsSpace: 'Lab ',
                vertices: [
                    [0.0, 0.0, 0.0], // blackpoint
                    [100.0, 0.0, 0.0], // whitepoint
                    [50.0, 60.0, 10.0], // red primary
                    [50.0, -60.0, 60.0], // green primary
                    [50.0, -40.0, -60.0] // blue primary
                ],
                faces: [
                    [0, 3, 4],
                    [0, 2, 3],
                    [0, 4, 2],
                    [1, 4, 3],
                    [1, 3, 2],
                    [1, 2, 4]
                ]
            };
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

        var updateModel = function() {
                var geometry = new THREE.SphereGeometry(0.1);
                var material = new THREE.MeshBasicMaterial({color: 0xffff00} );
                var sphere = new THREE.Mesh(geometry, material);

                for (var i = 0; i < activeGamut.vertices.length; ++i) {
                        var vertexSphere = sphere.clone();

                        var vertex = activeGamut.vertices[i];
                        vertexSphere.position.set(vertex[1] / 50, vertex[0] / 50, vertex[2] / 50);

                        //var labConv = chromatist.cielab.Converter();
                        //var rgbConv = chromatist.rgb.Converter();
                        //var XYZ = labConv.to_XYZ(vertex);
                        //var rgb = rgbConv.from_XYZ(XYZ);
                        //rgb[0] = Math.max(Math.min(rgb[0], 1), 0);
                        //rgb[1] = Math.max(Math.min(rgb[1], 1), 0);
                        //rgb[2] = Math.max(Math.min(rgb[2], 1), 0);
                        //vertexSphere.material.color = parseInt(chromatist.rgb.to_hex(rgb).replace(/^#/, ''), 16);

                        scene.add(vertexSphere);
                }
        }

        var profileUpload = $("#profile-upload");
        profileUpload.on('change', uploadProfile);

        var visualizer = $("#visualizer");
        visualizer.on('dragover', handleDragOver);
        visualizer.on('drop', handleFileDrop);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(75, visualizer.innerWidth() / visualizer.innerHeight(), 0.1, 1000);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(visualizer.innerWidth(), visualizer.innerHeight());
        visualizer.append(renderer.domElement);

        var modelPoints = [];

        camera.position.z = 5;

        var rotatingCamera = false;
        var mousePos = new THREE.Vector2(0, 0);

        visualizer.mousedown(function(event) {
            if (event.button == 0) {
                rotatingCamera = true;
            }
        });

        visualizer.mouseup(function(event) {
            if (event.button == 0) {
                rotatingCamera = false;
            }
        });

        visualizer.mousemove(function(event) {
            newPos = new THREE.Vector2(event.clientX, event.clientY);
            movement = new THREE.Vector2().subVectors(newPos, mousePos);
            mousePos = newPos;

            if (rotatingCamera) {
                var movementStrength = 0.01;
                //var rotation = new THREE.Euler(movement.y * movementStrength, movement.x * movementStrength, 0);
                var rotation = new THREE.Euler(0, -movement.x * movementStrength, 0);
                //var rotation = new THREE.Euler(movement.y * movementStrength, 0, 0);
                camera.position.applyEuler(rotation);

                console.log(camera.rotation);
                var target = new THREE.Vector3(0, 0, 0);
                var targetDistance = new THREE.Vector3().subVectors(target, camera.position).normalize();
                console.log(-targetDistance.z);
                var xVector = new THREE.Vector2(Math.abs(targetDistance.z), targetDistance.y).normalize();
                var yVector = new THREE.Vector2(-targetDistance.z, targetDistance.x).normalize();
                camera.rotation.x = Math.atan2(xVector.y, xVector.x);
                camera.rotation.y = -Math.atan2(yVector.y, yVector.x);
                camera.rotation.z = 0;
                camera.rotation.order = 'YXZ';
            }
        });

        activeGamut = getGamutMockData();
        updateModel();

        function render() {
            requestAnimationFrame(render);
            renderer.render(scene, camera);
        }
        render();
    }]);
})();

/* vim: set ts=4 sw=4 expandtab: */
