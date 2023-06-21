const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const FormData = require('form-data');
const p = require('path');
const {promises: fs} = require('fs');
const assert = require('assert/strict');
const config = require('../../../core/shared/config');
const urlUtils = require('../../../core/shared/url-utils');
const imageTransform = require('@tryghost/image-transform');
const sinon = require('sinon');
const storage = require('../../../core/server/adapters/storage');
const {anyErrorId} = matchers;
const {imageSize} = require('../../../core/server/lib/image');
const configUtils = require('../../utils/configUtils');
const logging = require('@tryghost/logging');

const images = [];
let agent, frontendAgent, ghostServer;
/**
 *
 * @param {object} options
 * @param {Buffer} options.fileContents
 * @param {string} options.filename
 * @param {string} options.contentType
 * @param {string} [options.ref]
 * @returns
 */
const uploadImageRequest = ({fileContents, filename, contentType, ref}) => {
    const form = new FormData();
    form.append('file', fileContents, {
        filename,
        contentType
    });

    form.append('purpose', 'image');
    if (ref) {
        form.append('ref', ref);
    }

    return agent
        .post('/images/upload/')
        .body(form);
};

/**
 *
 * @param {object} options
 * @param {string} options.path
 * @param {string} options.filename
 * @param {string} options.contentType
 * @param {string} [options.expectedFileName]
 * @param {string} [options.expectedOriginalFileName]
 * @param {string} [options.ref]
 * @param {boolean} [options.skipOriginal]
 * @returns
 */
const uploadImageCheck = async ({path, filename, contentType, expectedFileName, expectedOriginalFileName, ref, skipOriginal}) => {
    const fileContents = await fs.readFile(path);
    const {body} = await uploadImageRequest({fileContents, filename, contentType, ref}).expectStatus(201);
    expectedFileName = expectedFileName || filename;

    assert.match(body.images[0].url, new RegExp(`${urlUtils.urlFor('home', true)}content/images/\\d+/\\d+/${expectedFileName}`));
    assert.equal(body.images[0].ref, ref === undefined ? null : ref);

    const relativePath = body.images[0].url.replace(urlUtils.urlFor('home', true), '/');
    const filePath = config.getContentPath('images') + relativePath.replace('/content/images/', '');
    images.push(filePath);

    // Get original image path
    const originalFilePath = skipOriginal ? filePath : (expectedOriginalFileName ? filePath.replace(expectedFileName, expectedOriginalFileName) : imageTransform.generateOriginalImageName(filePath));
    images.push(originalFilePath);

    // Check the image is saved to disk
    const saved = await fs.readFile(originalFilePath);
    assert.equal(saved.length, fileContents.length);
    assert.deepEqual(saved, fileContents);

    const savedResized = await fs.readFile(filePath);
    assert.ok(savedResized.length <= fileContents.length); // should always be smaller

    // Check the image is served in the frontend using the provided URL
    const {body: data} = await frontendAgent
        .get(relativePath)
        //.expect('Content-Length', savedResized.length.toString()) // not working for SVG for some reason?
        .expect('Content-Type', contentType)
        .expect(200);
    assert.equal(Buffer.from(data).length, savedResized.length);

    // Make sure we support w10
    configUtils.set('imageOptimization:contentImageSizes', {
        w10: {width: 10},
        w1: {width: 1}
    });

    // Check if image resizing and formatting works
    const resizedPath = relativePath.replace('/content/images/', '/content/images/size/w10/format/webp/');
    await frontendAgent
        .get(resizedPath)
        .expect('Content-Type', 'image/webp')
        .expect(200);

    const resizedFilePath = filePath.replace('/images/', '/images/size/w10/format/webp/');
    const size = await imageSize.getImageSizeFromPath(resizedFilePath);
    assert.equal(size.width, 10, 'Resized images should have a width that has actually changed');

    if (!contentType.includes('svg')) {
        // Check if image resizing without formatting works
        const resizedPath2 = relativePath.replace('/content/images/', '/content/images/size/w1/');
        await frontendAgent
            .get(resizedPath2)
            .expect('Content-Type', contentType)
            .expect(200);

        const resizedFilePath2 = filePath.replace('/images/', '/images/size/w1/');
        const size2 = await imageSize.getImageSizeFromPath(resizedFilePath2);

        // Note: we chose width 1 because the resized image bytes should be less or it is ignored
        assert.equal(size2.width, 1, 'Resized images should have a width that has actually changed');
    }

    return {
        relativePath,
        filePath,
        originalFilePath,
        fileContents
    };
};

describe('Images API', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;
        frontendAgent = agents.frontendAgent;
        ghostServer = agents.ghostServer;
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    after(function () {
        configUtils.restore();
        ghostServer.stop();
    });

    afterEach(async function () {
        // Delete all images after each test
        for (const image of images) {
            try {
                await fs.unlink(image);
            } catch (e) {
                // ignore
            }
        }

        // Clean
        images.splice(0, images.length);
        sinon.restore();
    });

    it('Can upload a png', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');
        await uploadImageCheck({path: originalFilePath, filename: 'ghost-logo.png', contentType: 'image/png', ref: 'https://ghost.org/ghost-logo.png'});
    });

    it('Can upload a jpg', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg');
        await uploadImageCheck({path: originalFilePath, filename: 'ghosticon.jpg', contentType: 'image/jpeg'});
    });

    it('Can upload a gif', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/loadingcat.gif');
        await uploadImageCheck({path: originalFilePath, filename: 'loadingcat.gif', contentType: 'image/gif'});
    });

    it('Can upload a webp', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghosticon.webp');
        await uploadImageCheck({path: originalFilePath, filename: 'ghosticon.webp', contentType: 'image/webp'});
    });

    it('Can upload a svg', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.svg');
        await uploadImageCheck({path: originalFilePath, filename: 'ghost.svg', contentType: 'image/svg+xml', skipOriginal: true});
    });

    it('Can upload a square profile image', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/loadingcat_square.gif');
        await uploadImageCheck({path: originalFilePath, filename: 'loadingcat_square.gif', contentType: 'image/gif'});
    });

    it('Can not upload a json file', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/data/redirects.json');
        const fileContents = await fs.readFile(originalFilePath);
        const loggingStub = sinon.stub(logging, 'error');
        await uploadImageRequest({fileContents, filename: 'redirects.json', contentType: 'application/json'})
            .expectStatus(415)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can not upload a file without extension', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/data/redirects.json');
        const fileContents = await fs.readFile(originalFilePath);
        const loggingStub = sinon.stub(logging, 'error');
        await uploadImageRequest({fileContents, filename: 'redirects', contentType: 'image/png'})
            .expectStatus(415)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can not upload a json file with image mime type', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/data/redirects.json');
        const fileContents = await fs.readFile(originalFilePath);
        const loggingStub = sinon.stub(logging, 'error');
        await uploadImageRequest({fileContents, filename: 'redirects.json', contentType: 'image/gif'})
            .expectStatus(415)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can not upload a json file with image file extension', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/data/redirects.json');
        const fileContents = await fs.readFile(originalFilePath);
        const loggingStub = sinon.stub(logging, 'error');
        await uploadImageRequest({fileContents, filename: 'redirects.png', contentType: 'application/json'})
            .expectStatus(415)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can upload multiple images with the same name', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');
        const originalFilePath2 = p.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg');

        await uploadImageCheck({path: originalFilePath, filename: 'a.png', contentType: 'image/png'});
        await uploadImageCheck({path: originalFilePath2, filename: 'a.png', contentType: 'image/png', expectedFileName: 'a-1.png', expectedOriginalFileName: 'a-1_o.png'});
    });

    it('Can upload image with number suffix', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');
        await uploadImageCheck({path: originalFilePath, filename: 'a-2.png', contentType: 'image/png'});
    });

    it('Trims _o suffix from uploaded files', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');
        await uploadImageCheck({path: originalFilePath, filename: 'a-3_o.png', contentType: 'image/png', expectedFileName: 'a-3.png', expectedOriginalFileName: 'a-3_o.png'});
    });

    it('Can use _o in uploaded file name, as long as it is not at the end', async function () {
        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');
        await uploadImageCheck({path: originalFilePath, filename: 'a_o-3.png', contentType: 'image/png', expectedFileName: 'a_o-3.png', expectedOriginalFileName: 'a_o-3_o.png'});
    });

    it('Can upload around midnight of month change', async function () {
        const clock = sinon.useFakeTimers({now: new Date(2022, 0, 31, 23, 59, 59), shouldAdvanceTime: true});
        assert.equal(new Date().getMonth(), 0);

        const originalFilePath = p.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png');

        // Delay the first original file upload by 400ms to force race condition
        const store = storage.getStorage('images');
        const saveStub = sinon.stub(store, 'save');
        let calls = 0;
        saveStub.callsFake(async function (file) {
            if (file.name.includes('_o')) {
                calls += 1;
                if (calls === 1) {
                    clock.tick(5000);
                    assert.equal(new Date().getMonth(), 1);
                }
            }
            return saveStub.wrappedMethod.call(this, ...arguments);
        });
        await uploadImageCheck({path: originalFilePath, filename: 'a.png', contentType: 'image/png'});
        clock.restore();
    });
});
