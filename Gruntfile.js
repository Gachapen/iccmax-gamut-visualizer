module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      libsdev: {
        files: [
          {
            expand: true,
            cwd: 'node_modules/angular',
            src: [
              'angular.js'
            ],
            dest: 'build/lib/'
          }
        ]
	    },
      app: {
        files: [
          {
            expand: true,
            cwd: 'app/',
            src: [
              'app.js'
            ],
            dest: 'build/'
          }
        ]
      }
    },
    htmlbuild: {
      dev: {
        src: 'app/index.html',
        dest: 'build/',
        options: {
          beautify: true,
          scripts: {
            libs: [
              'build/lib/angular.js'
            ],
            app: [
              'build/app.js'
            ]
          },
          styles: {
          }
        }
      }
    },
    clean: [
      'build/*'
    ]
  });

  // Load the plugins.
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-html-build');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Default task(s).
  grunt.registerTask('default', [
    'copy:libsdev',
    'copy:app',
    'htmlbuild:dev'
  ]);
};
