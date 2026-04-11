/**
 * Gulp Configuration
 * Defines paths and settings for the build pipeline
 */

export const headerText = `
// Q1W - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
`;

export const scripts = {
  src: {
    js: ['src/**/*.js', '!src/**/third_party/**/*.js'],
    thirdParty: ['src/**/third_party/**/*.js'],
    xml: ['src/**/*.xml'],
    html: ['src/**/*.html'],
    css: ['src/**/*.css'],
    json: ['src/**/*.json'],
    sdfConfig: ['project.json'],
    all: ['src/**/*.*'],
  },
  dest: 'dist',
};

export const paths = {
  src: 'src',
  dist: 'dist',
  fileCabinet: 'src/FileCabinet',
  objects: 'src/Objects',
};
