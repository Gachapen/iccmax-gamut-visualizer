(function(){
    var app = angular.module('iccmax-gamut', []);
    app.controller('AppController', ['$scope', function($scope) {
        var ctrl = this;

        var activeGamut = {
            numPcsChannels: 2,
            pcsSpace: '    ',
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

                var pcsIndex = 20;
                var pcs = String.fromCharCode(
                    dv.getUint8(pcsIndex),
                    dv.getUint8(pcsIndex + 1),
                    dv.getUint8(pcsIndex + 2),
                    dv.getUint8(pcsIndex + 3));

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
                        activeGamut.pcsSpace = pcs;
                        ctrl.updateModel();
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

            var dataTransfer = e.originalEvent.dataTransfer;
            if (dataTransfer) {
                dataTransfer.dropEffect = 'copy';
            }

            return false;
        };

        var handleFileDrop = function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }

            var dataTransfer = e.originalEvent.dataTransfer;
            if (dataTransfer) {
                var files = dataTransfer.files;
                if (files.length > 0) {
                    $scope.$apply(function() {
                        readProfile(files[0]);
                    });
                }
            }

            return false;
        };

        var uploadProfile = function() {
           var file = this.files[0];
           $scope.$apply(function() {
               readProfile(file);
           });
        }

        var getVertexPosition = function(vertex) {
            if (activeGamut.pcsSpace == 'Lab ') {
                return new THREE.Vector3(vertex[1], vertex[0], -vertex[2]);
            } else {
                throw new Error("Can't get vertex position: PCS space \"" + activeGamut.pcsSpace + "\" is unknown");
            }
        }

        var getVertexColor = function(vertex) {
            var labConv = chromatist.cielab.Converter(activeGamut.whitepoint);
            var XYZ = labConv.to_XYZ(vertex);

            var adapt = chromatist.cat.Converter(activeGamut.whitepoint, chromatist.cie.standard_whitepoints.D65,'linear bradford');
            XYZn = adapt.forward(XYZ);

            var rgbConv = chromatist.rgb.Converter();
            var rgb = rgbConv.from_XYZ(XYZn);

            // Clamp values in case they are too small/large.
            rgb[0] = Math.max(Math.min(rgb[0], 1), 0);
            rgb[1] = Math.max(Math.min(rgb[1], 1), 0);
            rgb[2] = Math.max(Math.min(rgb[2], 1), 0);

            return new THREE.Color().fromArray(rgb);
        }

        var pointModelMaker = {
            mesh: null,
            make: function() {
                var geometry = new THREE.Geometry();

                for (var i = 0; i < activeGamut.vertices.length; ++i) {
                    var vertex = activeGamut.vertices[i];
                    geometry.vertices.push(getVertexPosition(vertex));
                    geometry.colors.push(getVertexColor(vertex));
                }

                var material = new THREE.PointsMaterial({
                    vertexColors: THREE.VertexColors,
                    size: 20
                });
                this.mesh = new THREE.Points(geometry, material);

                scene.add(this.mesh);
            },
            destroy: function() {
                if (this.mesh) {
                    scene.remove(this.mesh);
                    this.mesh = null;
                }
            }
        }

        var makeModelMesh = function() {
            var geometry = new THREE.Geometry();

            for (var i = 0; i < activeGamut.vertices.length; ++i) {
                var vertex = activeGamut.vertices[i];

                geometry.vertices.push(getVertexPosition(vertex));
            }

            for (var i = 0; i < activeGamut.faces.length; ++i) {
                var face = activeGamut.faces[i];

                var a = face[2];
                var b = face[1];
                var c = face[0];
                var normals = [];
                var colors = [
                    getVertexColor(activeGamut.vertices[a]),
                    getVertexColor(activeGamut.vertices[b]),
                    getVertexColor(activeGamut.vertices[c])
                ];
                geometry.faces.push(new THREE.Face3(a, b, c, normals, colors));
            }

            var material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.FaceColors
            });

            var mesh = new THREE.Mesh(geometry, material);
            return mesh;
        }

        var solidModelMaker = {
            mesh: null,
            make: function() {
                this.mesh = makeModelMesh();
                scene.add(this.mesh);
            },
            destroy: function() {
                if (this.mesh) {
                    scene.remove(this.mesh);
                    this.mesh = null;
                }
            }
        }

        var wireframeModelMaker = {
            mesh: null,
            make: function() {
                this.mesh = makeModelMesh();
                this.mesh.material.wireframe = true;
                scene.add(this.mesh);
            },
            destroy: function() {
                if (this.mesh) {
                    scene.remove(this.mesh);
                    this.mesh = null;
                }
            }
        }

        ctrl.updateModel = function() {
            ctrl.previousModelMaker.maker.destroy();
            ctrl.modelMaker.maker.make();
            ctrl.previousModelMaker = ctrl.modelMaker;
        }

        var setupCielabAxes = function() {
            var axisMaterial = new THREE.LineBasicMaterial({
                    vertexColors: THREE.VertexColors
            });

            var aAxis = new THREE.Geometry();
            aAxis.vertices.push(
                    new THREE.Vector3(-100, 50, 0),
                    new THREE.Vector3(0, 50, 0),
                    new THREE.Vector3(0, 50, 0),
                    new THREE.Vector3(100, 50, 0),
                    new THREE.Vector3(0, 50, 100),
                    new THREE.Vector3(0, 50, 0),
                    new THREE.Vector3(0, 50, 0),
                    new THREE.Vector3(0, 50, -100),
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 100, 0)
            );
            aAxis.colors.push(
                    new THREE.Color(0, 1, 0),
                    new THREE.Color(0.5, 0.5, 0.5),
                    new THREE.Color(0.5, 0.5, 0.5),
                    new THREE.Color(1, 0, 0),
                    new THREE.Color(0, 0, 1),
                    new THREE.Color(0.5, 0.5, 0.5),
                    new THREE.Color(0.5, 0.5, 0.5),
                    new THREE.Color(1, 1, 0),
                    new THREE.Color(0, 0, 0),
                    new THREE.Color(1, 1, 1)
            );
            var aAxisLine = new THREE.LineSegments(aAxis, axisMaterial);
            scene.add(aAxisLine);
        }

        var profileUpload = $("#profile-upload");
        profileUpload.on('change', uploadProfile);

        var visualizer = $("#visualizer");
        visualizer.on('dragover', handleDragOver);
        visualizer.on('drop', handleFileDrop);

        var scene = new THREE.Scene();

        //var camera = new THREE.PerspectiveCamera(8, visualizer.innerWidth() / visualizer.innerHeight(), 800, 1200);
        var camera = new THREE.OrthographicCamera(-130, 130, 130, -130, 800, 1200);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(visualizer.innerWidth(), visualizer.innerHeight());
        renderer.setClearColor(0xCCCCCC);
        visualizer.append(renderer.domElement);

        var rotatingCamera = false;
        var mousePos = new THREE.Vector2(0, 0);
        var cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        var cameraDistance = 1000;
        var cameraHeight = 50;

        camera.position.y = cameraHeight;
        camera.position.z = cameraDistance;

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
                cameraRotation.x += -movement.y * movementStrength;
                cameraRotation.y += -movement.x * movementStrength;
                camera.position.set(0, 0, cameraDistance).applyEuler(cameraRotation);
                camera.position.y += cameraHeight;

                var target = new THREE.Vector3(0, cameraHeight, 0);
                camera.lookAt(target);
            }
        });

        ctrl.modelMakers = [
            {
                name: "Solid",
                maker: solidModelMaker
            },
            {
                name: "Wireframe",
                maker: wireframeModelMaker
            },
            {
                name: "Point",
                maker: pointModelMaker
            }
        ];

        ctrl.modelMaker = ctrl.modelMakers[0];
        ctrl.previousModelMaker = ctrl.modelMaker;

        setupCielabAxes();

        function render() {
            requestAnimationFrame(render);

            renderer.render(scene, camera);
        }

        render();
    }]);
})();

/* vim: set ts=4 sw=4 expandtab: */
