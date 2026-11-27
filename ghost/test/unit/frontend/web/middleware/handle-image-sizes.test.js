const assert = require('node:assert/strict');
const sinon = require('sinon');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const handleImageSizes = require('../../../../../core/frontend/web/middleware/handle-image-sizes.js');
const { imageSize } = require('../../../../../core/server/lib/image');
const Module = require('node:module');
const sharp = require('sharp');
const errors = require('@tryghost/errors');

// A small image, so a resize without enlargement keeps its size
const createImage = (format) =>
  sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
    .toFormat(format)
    .toBuffer();

const fakeResBase = {
  setHeader() {},
};

// @TODO make these tests lovely and non specific to implementation
describe('handleImageSizes middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('calls next immediately if the url does not match /size/something/', function () {
    const { promise, resolve } = Promise.withResolvers();
    const fakeReq = {
      url: '/size/something',
    };
    handleImageSizes(fakeReq, fakeResBase, function next() {
      resolve();
    });
    return promise;
  });

  it('calls next immediately if the url does not match /size/whatever/', function () {
    const { promise, resolve } = Promise.withResolvers();
    const fakeReq = {
      url: '/url/whatever/',
    };
    handleImageSizes(fakeReq, fakeResBase, function next() {
      resolve();
    });
    return promise;
  });

  it('calls next immediately if the file extension is missing', function () {
    const { promise, resolve } = Promise.withResolvers();
    const fakeReq = {
      url: '/size/something/file',
    };
    handleImageSizes(fakeReq, fakeResBase, function next() {
      resolve();
    });
    return promise;
  });

  it('calls next immediately if the file has a trailing slash', function () {
    const { promise, resolve } = Promise.withResolvers();
    const fakeReq = {
      url: '/size/something/file.jpg/',
    };
    handleImageSizes(fakeReq, fakeResBase, function next() {
      resolve();
    });
    return promise;
  });

  it('calls next immediately if the url does not match /size//', function () {
    const { promise, resolve } = Promise.withResolvers();
    const fakeReq = {
      url: '/size//',
    };
    handleImageSizes(fakeReq, fakeResBase, function next() {
      resolve();
    });
    return promise;
  });

  describe('file handling', function () {
    let dummyStorage;
    let dummyTheme;
    let saveRawSpy;
    let buffer;

    beforeEach(async function () {
      buffer = await createImage('png');
      dummyStorage = {
        async exists() {
          return true;
        },

        read() {
          return buffer;
        },

        async saveRaw(_buf, url) {
          return url;
        },
      };

      dummyTheme = {
        config(key) {
          if (key === 'image_sizes') {
            return {
              l: {
                width: 1000,
              },
              m: {
                width: 1000,
                height: 200,
              },
              n: {
                height: 1000,
              },
              h100: {
                height: 100,
              },
              missing: {},
            };
          }
        },
      };

      sinon.stub(adapterManager, 'getAdapter').returns(dummyStorage);
      // imageSize resolves the images storage adapter once at require time,
      // so stubbing adapterManager alone doesn't reach it
      sinon.stub(imageSize, 'imageStore').value(dummyStorage);
      sinon.stub(activeTheme, 'get').returns(dummyTheme);
      saveRawSpy = sinon.spy(dummyStorage, 'saveRaw');
    });

    const savedImage = () => sharp(saveRawSpy.firstCall.args[0]).metadata();

    it('redirects for invalid format extension', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      const fakeReq = {
        url: '/size/w1000/format/test/image.jpg',
        originalUrl: '/blog/content/images/size/w1000/format/test/image.jpg',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/image.jpg');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };
      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('redirects for invalid sizes', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      const fakeReq = {
        url: '/size/w123/image.jpg',
        originalUrl: '/blog/content/images/size/w123/image.jpg',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/image.jpg');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };
      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('strips multiple leading slashes when redirecting to the original URL', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      const fakeReq = {
        url: '/size/w123/image.jpg',
        originalUrl: '////example.com/content/images/size/w123/image.jpg',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/example.com/content/images/image.jpg');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };
      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('redirects for invalid configured size', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      const fakeReq = {
        url: '/size/missing/image.jpg',
        originalUrl: '/blog/content/images/size/missing/image.jpg',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/image.jpg');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };
      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('returns original URL if file is empty', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function (path) {
        if (path === '/blank_o.png') {
          return true;
        }
        if (path === '/size/w1000/blank.png') {
          return false;
        }
      };
      dummyStorage.read = async function () {
        return Buffer.from([]);
      };

      const fakeReq = {
        url: '/size/w1000/blank.png',
        originalUrl: '/blog/content/images/size/w1000/blank.png',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('returns original URL if unsupported storage adapter', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.saveRaw = undefined;

      const fakeReq = {
        url: '/size/w1000/blank.png',
        originalUrl: '/blog/content/images/size/w1000/blank.png',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('redirects if sharp is not installed', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      sinon
        .stub(Module.prototype, 'require')
        .callThrough()
        .withArgs('sharp')
        .throws(new errors.InternalServerError({ message: "Cannot find module 'sharp'" }));

      const fakeReq = {
        url: '/size/w1000/blank.png',
        originalUrl: '/blog/content/images/size/w1000/blank.png',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('redirects if image processing fails', function () {
      const { promise, resolve, reject } = Promise.withResolvers();

      dummyStorage.exists = async function () {
        return false;
      };

      dummyStorage.read = async function () {
        return Buffer.from('not an image');
      };

      const fakeReq = {
        url: '/size/w1000/blank.png',
        originalUrl: '/blog/content/images/size/w1000/blank.png',
      };

      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('continues if file exists', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function (path) {
        if (path === '/size/w1000/blank.png') {
          return true;
        }
      };

      const fakeReq = {
        url: '/size/w1000/blank.png',
        originalUrl: '/size/w1000/blank.png',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
      return promise;
    });

    it('uses unoptimizedImageExists if it exists', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function (path) {
        if (path === '/blank_o.png') {
          return true;
        }
      };
      const spy = sinon.spy(dummyStorage, 'read');

      const fakeReq = {
        url: '/size/h100/blank.png',
        originalUrl: '/size/h100/blank.png',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        try {
          sinon.assert.calledOnceWithExactly(spy, { path: '/blank_o.png' });
        } catch (e) {
          return reject(e);
        }
        resolve();
      });
      return promise;
    });

    it('uses unoptimizedImageExists if it exists with formatting', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function (path) {
        if (path === '/blank_o.png') {
          return true;
        }
      };
      const spy = sinon.spy(dummyStorage, 'read');

      const fakeReq = {
        url: '/size/w1000/format/webp/blank.png',
        originalUrl: '/size/w1000/format/webp/blank.png',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        type: function () {},
        setHeader() {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        try {
          sinon.assert.calledOnceWithExactly(spy, { path: '/blank_o.png' });
          sinon.assert.calledOnceWithExactly(typeStub, 'webp');
        } catch (e) {
          return reject(e);
        }
        resolve();
      });
      return promise;
    });

    it('skips SVG if not formatted', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };

      const fakeReq = {
        url: '/size/w1000/blank.svg',
        originalUrl: '/blog/content/images/size/w1000/blank.svg',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.svg');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('skips formatting to ico', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };

      const fakeReq = {
        url: '/size/w1000/format/ico/blank.png',
        originalUrl: '/blog/content/images/size/w1000/format/ico/blank.png',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('skips formatting from ico', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };

      const fakeReq = {
        url: '/size/w1000/format/png/blank.ico',
        originalUrl: '/blog/content/images/size/w1000/format/png/blank.ico',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.ico');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it('skips formatting to svg', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };

      const fakeReq = {
        url: '/size/w1000/format/svg/blank.png',
        originalUrl: '/blog/content/images/size/w1000/format/svg/blank.png',
      };
      const fakeRes = {
        redirect(url) {
          try {
            assert.equal(url, '/blog/content/images/blank.png');
          } catch (e) {
            return reject(e);
          }
          resolve();
        },
        setHeader() {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        reject(new Error('Should not have called next'));
      });
      return promise;
    });

    it("doesn't skip SVGs if formatted to PNG", function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = async function () {
        return Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        );
      };

      const fakeReq = {
        url: '/size/w1000/format/png/blank.svg',
        originalUrl: '/size/w1000/format/png/blank.svg',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        savedImage()
          .then((metadata) => {
            assert.equal(metadata.format, 'png');
            assert.equal(metadata.width, 1000);
            sinon.assert.calledOnceWithExactly(typeStub, 'png');
          })
          .then(resolve, reject);
      });
      return promise;
    });

    it('can format PNG to WEBP', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = async function () {
        return buffer;
      };

      const fakeReq = {
        url: '/size/w1000/format/webp/blank.png',
        originalUrl: '/size/w1000/format/webp/blank.png',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');
      const timeoutSpy = sinon.spy(sharp.prototype, 'timeout');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        savedImage()
          .then((metadata) => {
            assert.equal(metadata.format, 'webp');
            assert.equal(metadata.width, 10);
            sinon.assert.calledOnceWithExactly(typeStub, 'webp');
            sinon.assert.calledOnceWithExactly(timeoutSpy, {
              seconds: handleImageSizes.RESIZE_TIMEOUT_SECONDS,
            });
          })
          .then(resolve, reject);
      });
      return promise;
    });

    it('can format PNG to AVIF', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = async function () {
        return buffer;
      };

      const fakeReq = {
        url: '/size/w1000/format/avif/blank.png',
        originalUrl: '/size/w1000/format/avif/blank.png',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        savedImage()
          .then((metadata) => {
            assert.equal(metadata.format, 'heif');
            assert.equal(metadata.width, 10);
            sinon.assert.calledOnceWithExactly(typeStub, 'image/avif');
          })
          .then(resolve, reject);
      });
      return promise;
    });

    it('can format GIF to WEBP', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = function () {
        return createImage('gif');
      };

      const fakeReq = {
        url: '/size/w1000/format/webp/blank.gif',
        originalUrl: '/size/w1000/format/webp/blank.gif',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        savedImage()
          .then((metadata) => {
            assert.equal(metadata.format, 'webp');
            assert.equal(metadata.width, 10);
            sinon.assert.calledOnceWithExactly(typeStub, 'webp');
          })
          .then(resolve, reject);
      });
      return promise;
    });

    it('can format WEBP to GIF', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = function () {
        return createImage('webp');
      };

      const fakeReq = {
        url: '/size/w1000/format/gif/blank.webp',
        originalUrl: '/size/w1000/format/gif/blank.webp',
      };
      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };
      const typeStub = sinon.spy(fakeRes, 'type');

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        savedImage()
          .then((metadata) => {
            assert.equal(metadata.format, 'gif');
            assert.equal(metadata.width, 10);
            sinon.assert.calledOnceWithExactly(typeStub, 'gif');
          })
          .then(resolve, reject);
      });
      return promise;
    });

    it('goes to next middleware with no error if source and resized image 404', function () {
      const { promise, resolve, reject } = Promise.withResolvers();
      dummyStorage.exists = async function () {
        return false;
      };
      dummyStorage.read = async function () {
        throw new errors.NotFoundError({
          message: 'File not found',
        });
      };

      const fakeReq = {
        url: '/size/w1000/2020/02/test.png',
        originalUrl: '/2020/02/test.png',
      };

      const fakeRes = {
        redirect() {
          reject(new Error('Should not have called redirect'));
        },
        setHeader() {},
        type: function () {},
      };

      handleImageSizes(fakeReq, fakeRes, function next(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
      return promise;
    });
  });
});
