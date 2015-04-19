var path = require('path');

module.exports = function (grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		uglify: {
		    options: {
		    	banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
		    			'<%= grunt.template.today("yyyy-mm-dd") %> */\n'
		    },
		    build: {
				files: [{
					expand: true,
					cwd: 'views/js',
					src: '*.js',
					dest: 'public/javascripts'
				}]
		    }
  		},

  		sass: {
  			dist: {
  				files: [{
  					expand: true,
  					cwd: 'sass',
  					src: ['*.scss'],
  					dest: '../public/stylesheets',
  					ext: '.css'
  				}]
  			}
  		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');

};