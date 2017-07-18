/**
 * File-system use goes here.
 *
 * We should try to reduce these, so logging when it happens is useful.
 *
 * It's also useful to mock it away in other components.
 */

'use strict';

const fs = require('fs'),
  path = require('path'),
  yaml = require('js-yaml'),
  control = require('./control');

/**
 * @param {string} filename
 * @returns {string}
 */
function fileExists(filename) {
  try {
    return !!fs.statSync(filename);
  } catch (ex) {
    return false;
  }
}

/**
 * @param {string} filename
 * @returns {string}
 */
function readFile(filename) {
  try {
    return fs.readFileSync(filename, 'utf8');
  } catch (ex) {
    return null;
  }
}

/**
 * @param {string} file
 * @returns {boolean}
 */
function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch (ex) {
    return false;
  }
}

/**
 *
 * @param {string} dir
 * @returns {Array}
 */
function getFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(function (file) {
        return !exports.isDirectory(path.join(dir, file)) &&
          file.indexOf('.test.') === -1 && // ignore test files
          file.indexOf('.md') === -1; // ignore documentation files
      });
  } catch (ex) {
    return [];
  }
}

/**
 * Get folder names.
 *
 * Should only occur once per directory.
 *
 * @param  {string} dir enclosing folder
 * @return {[]}     array of folder names
 */
function getFolders(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(function (file) {
        return exports.isDirectory(path.join(dir, file));
      });
  } catch (ex) {
    return [];
  }
}

/**
 * Try to require a module, do not fail if module is missing
 * @param {string} filePath
 * @returns {module}
 * @throw if fails for reason other than missing module
 */
function tryRequire(filePath) {
  let resolvedPath = require.resolve(filePath);

  if (resolvedPath) {
    return require(resolvedPath);
  }

  return undefined;
}

/**
 * Try to get a module, or return false.
 *
 * @param {[string]} paths  Possible paths to find their module.
 * @returns {object|false}
 */
function tryRequireEach(paths) {
  let result;

  while (!result && paths.length) {
    result = tryRequire(paths.shift());
  }

  return result;
}

/**
 * @param {string} filename
 * @returns {string}
 */
function getYaml(filename) {
  const data = readFile(filename + '.yaml') || readFile(filename + '.yml');

  return yaml.safeLoad(data);
}


/**
 * Returns a promise representing the retrieval of content from a file
 *
 * @param  {string} file A filename
 * @return {Promise}
 */
function readFilePromise(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

module.exports.getYaml = control.memoize(getYaml);
module.exports.getFiles = control.memoize(getFiles);
module.exports.getFolders = control.memoize(getFolders);
module.exports.fileExists = control.memoize(fileExists);
module.exports.isDirectory = control.memoize(isDirectory);
module.exports.tryRequire = control.memoize(tryRequire);
module.exports.tryRequireEach = tryRequireEach;
module.exports.readFilePromise = control.memoize(readFilePromise);
