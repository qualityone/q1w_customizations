/**
 * Gulp Build Pipeline
 * Transpiles ES6 to AMD 2.1 format for NetSuite SuiteScript compatibility
 */

import { src, dest, parallel, series, watch, lastRun } from 'gulp';
import babel from 'gulp-babel';
import header from 'gulp-header';
import debug from 'gulp-debug';
import del from 'del';
import { headerText, scripts } from './gulp/config';

// Parse command line arguments
const args = process.argv.slice(2);
const noTranspile = args.includes('--mode=notranspile');

/**
 * Clean the dist folder
 */
export const cleanBuild = () => del([scripts.dest]);

/**
 * Transpile ES6 JavaScript files to AMD 2.1 format
 * Excludes third_party folder
 */
const transpileES6 = () => {
  if (noTranspile) {
    return src(scripts.src.js, { since: lastRun(transpileES6) })
      .pipe(debug({ title: 'Copying JS (no transpile):' }))
      .pipe(header(headerText))
      .pipe(dest(scripts.dest));
  }

  return src(scripts.src.js, { since: lastRun(transpileES6) })
    .pipe(debug({ title: 'Transpiling:' }))
    .pipe(babel())
    .pipe(header(headerText))
    .pipe(dest(scripts.dest));
};

/**
 * Copy third_party JavaScript files without transpilation
 */
const copyThirdPartyFiles = () =>
  src(scripts.src.thirdParty, { since: lastRun(copyThirdPartyFiles) })
    .pipe(debug({ title: 'Copying Third Party JS:' }))
    .pipe(dest(scripts.dest));

/**
 * Copy XML files (SDF objects, manifest, deploy)
 */
const copyXMLFiles = () =>
  src(scripts.src.xml, { since: lastRun(copyXMLFiles) })
    .pipe(debug({ title: 'Copying XML:' }))
    .pipe(dest(scripts.dest));

/**
 * Copy HTML template files
 */
const copyHTMLFiles = () =>
  src(scripts.src.html, { since: lastRun(copyHTMLFiles) })
    .pipe(debug({ title: 'Copying HTML:' }))
    .pipe(dest(scripts.dest));

/**
 * Copy CSS files
 */
const copyCSSFiles = () =>
  src(scripts.src.css, { since: lastRun(copyCSSFiles) })
    .pipe(debug({ title: 'Copying CSS:' }))
    .pipe(dest(scripts.dest));

/**
 * Copy JSON files
 */
const copyJSONFiles = () =>
  src(scripts.src.json, { since: lastRun(copyJSONFiles) })
    .pipe(debug({ title: 'Copying JSON:' }))
    .pipe(dest(scripts.dest));

/**
 * Copy SDF config files (project.json) to dist root
 */
const copySDFConfig = () =>
  src(scripts.src.sdfConfig, { since: lastRun(copySDFConfig) })
    .pipe(debug({ title: 'Copying SDF Config:' }))
    .pipe(dest(scripts.dest));

/**
 * Watch for file changes and rebuild incrementally
 */
const watchFiles = () => {
  watch(scripts.src.js, transpileES6);
  watch(scripts.src.thirdParty, copyThirdPartyFiles);
  watch(scripts.src.xml, copyXMLFiles);
  watch(scripts.src.html, copyHTMLFiles);
  watch(scripts.src.css, copyCSSFiles);
  watch(scripts.src.json, copyJSONFiles);
  watch(scripts.src.sdfConfig, copySDFConfig);
};

/**
 * Main build task
 */
const build = series(
  cleanBuild,
  parallel(transpileES6, copyThirdPartyFiles, copyXMLFiles, copyHTMLFiles, copyCSSFiles, copyJSONFiles, copySDFConfig)
);

/**
 * Watch task for development
 */
export const watchBuild = series(build, watchFiles);

export { watchBuild as watch };
export default build;
