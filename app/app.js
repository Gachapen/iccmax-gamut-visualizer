(function(){
	var app = angular.module('iccmax-gamut', []);
	app.controller('AppController', [function() {
		this.title = 'GAMUT';

        var renderCanvas = document.getElementById("visualizer-canvas");
        var gl = renderCanvas.getContext("webgl") || renderCanvas.getContext('experimental-webgl');
        if (!gl) {
            console.log("Error: Can't create WebGL context");
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        gl.viewport(0, 0, renderCanvas.width, renderCanvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}]);
})();
