'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  expect = require('chai').expect,
  sinon = require('sinon'),
  fs = require('fs'),
  path = require('path'),
  yaml = require('js-yaml'),
  glob = require('glob'),
  lib = require('./' + filename);

describe(_.startCase(filename), function () {
  let req, sandbox;

  function createMockStat(options) {
    return {
      isDirectory: _.constant(!!options.isDirectory)
    };
  }

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(fs, 'statSync');
    sandbox.stub(fs, 'readdirSync');
    sandbox.stub(fs, 'existsSync');
    sandbox.stub(fs, 'readFileSync');
    sandbox.stub(path, 'resolve');
    sandbox.stub(yaml);
    sandbox.stub(glob, 'sync');

    // clear the caches
    lib.getYaml.cache = new _.memoize.Cache();
    lib.getFiles.cache = new _.memoize.Cache();
    lib.getFolders.cache = new _.memoize.Cache();
    lib.isDirectory.cache = new _.memoize.Cache();
    lib.fileExists.cache = new _.memoize.Cache();
    lib.tryRequire.cache = new _.memoize.Cache();
    lib.readFilePromise.cache = new _.memoize.Cache();

    // require shouldn't be called dynamically, but here we go
    req = sandbox.stub();
    req.resolve = sandbox.stub();
    lib.setRequire(req);
  });

  afterEach(function () {
    sandbox.restore();
    lib.setRequire(require);
  });

  describe('fileExists', function () {
    const fn = lib[this.title];

    it('is true if exists', function () {
      fs.statSync.returns({});

      expect(fn('a')).to.equal(true);
    });

    it('is false if falsy', function () {
      expect(fn('a')).to.equal(false);
    });

    it('is false if throws', function () {
      fs.statSync.throws();

      expect(fn('a')).to.equal(false);
    });
  });

  describe('getFiles', function () {
    const fn = lib[this.title];

    it('gets a list of folders', function () {
      fs.readdirSync.returns(['isAFile', 'isADirectory']);
      fs.statSync.withArgs('isAFile').returns(createMockStat({isDirectory: false}));
      fs.statSync.withArgs('isADirectory').returns(createMockStat({isDirectory: true}));
      path.resolve.returnsArg(0);

      expect(fn('.')).to.contain('isAFile');
    });

    it('returns empty array on error', function () {
      fs.readdirSync.throws();

      expect(fn('.')).to.deep.equal([]);
    });
  });


  describe('getFolders', function () {
    const fn = lib[this.title];

    it('gets a list of folders', function () {
      fs.readdirSync.returns(['isAFolder', 'isNotAFolder']);
      fs.statSync.withArgs('isAFolder').returns(createMockStat({isDirectory: true}));
      fs.statSync.withArgs('isNotAFolder').returns(createMockStat({isDirectory: false}));
      path.resolve.returnsArg(0);

      expect(fn('.')).to.contain('isAFolder');
    });

    it('returns false if no directories', function () {
      fs.readdirSync.returns(undefined);

      expect(fn('.')).to.deep.equal([]);
    });
  });

  describe('getYaml', function () {
    let fn = lib[this.title];

    it('returns result', function () {
      const filename = 'some-name',
        result = 'some result';

      yaml.safeLoad.returns(result);

      expect(fn(filename)).to.equal(result);
    });

    it('returns result from first file', function () {
      const filename = 'some-name',
        result = 'some result';

      fs.readFileSync.onCall(0).returns(result);
      fs.readFileSync.onCall(1).throws();
      yaml.safeLoad.returnsArg(0);

      expect(fn(filename)).to.equal(result);
    });

    it('returns result from second file', function () {
      const filename = 'some-name',
        result = 'some result';

      fs.readFileSync.onCall(0).throws();
      fs.readFileSync.onCall(1).returns(result);
      yaml.safeLoad.returnsArg(0);

      expect(fn(filename)).to.equal(result);
    });

  });

  describe('readFilePromise', function () {
    const fn = lib[this.title];

    it('returns file contents', function () {
      const result = 'result',
        name = 'article.css';

      sandbox.stub(fs, 'readFile', function (path, options, callback) {
        return callback(null, result);
      });

      fn(name).then(function (fileResult) {
        expect(fileResult).to.equal(result);
      });
    });

    it('throws error', function () {
      sandbox.stub(fs, 'readFile', function (path, x, callback) {
        return callback(new Error(), '');
      });

      fn('.').catch(function (result) {
        expect(result).to.equal('');
      });
    });
  });

  describe('isDirectory', function () {
    const fn = lib[this.title];

    it('returns false if not a directory', function () {
      fs.statSync.withArgs('isNotAFolder').returns(createMockStat({isDirectory: false}));

      expect(fn()).to.be.false;
    });
  });

  describe('tryRequire', function () {
    const fn = lib[this.title];

    it('returns a module if one exists', function () {
      req.resolve.withArgs('.').returns('/path/to/file');
      req.returns({});

      expect(fn('.')).to.deep.equal({});
    });

    it('returns undefined in no file exists', function () {
      req.resolve.withArgs('.').returns(undefined);

      expect(fn('.')).to.be.undefined;
    });
  });

  describe('tryRequireEach', function () {
    const fn = lib[this.title];

    it('iterates through filepaths and tries to require them', function () {
      expect(fn(['path/to/file'])).to.be.undefined;
    });
  });
});
