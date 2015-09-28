(function(){
    var app = angular.module('iccmax-gamut', []);
    app.controller('AppController', ['$scope', function($scope) {
        this.title = 'GAMUT';

        var readProfile = function(file) {
            fileReader = new FileReader();
            fileReader.onloadend = function() {
                console.log("Read a file: " + fileReader.result);
            }
            fileReader.readAsBinaryString(file);
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
