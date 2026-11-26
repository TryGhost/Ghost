import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'fs-extra';
import supertest from 'supertest';

const config = require('../../../core/shared/config');
const localUtils = require('./utils');

// Database-backed test files share a worker process, and each boots Ghost with
// a content folder of its own. Theme files have to go to the folder of the boot
// that handles the request, whichever folder an earlier boot in the process used.
// Real HTTP requests, like the other theme tests.
describe('Themes API after a second boot in the same process', function () {
  type Agent = ReturnType<typeof supertest.agent>;

  const fixture = (name: string) =>
    path.join(__dirname, '..', '..', 'utils', 'fixtures', 'themes', name);

  const bootAndSignIn = async (): Promise<Agent> => {
    await localUtils.startGhost();
    const request = supertest.agent(config.get('url'));
    await localUtils.doAuth(request);

    return request;
  };

  const uploadTheme = (request: Agent, zipName: string) =>
    request
      .post(localUtils.API.getApiQuery('themes/upload'))
      .set('Origin', config.get('url'))
      .attach('file', fixture(zipName));

  it('uploads and deletes themes in the content folder of the current boot', async function () {
    // The first boot uses theme storage, in its own content folder
    const firstRequest = await bootAndSignIn();
    const firstThemesPath: string = config.getContentPath('themes');

    await uploadTheme(firstRequest, 'valid.zip').expect(200);
    assert.equal(await fs.pathExists(path.join(firstThemesPath, 'valid')), true);

    const secondRequest = await bootAndSignIn();
    const secondThemesPath: string = config.getContentPath('themes');
    assert.notEqual(secondThemesPath, firstThemesPath);

    const uploaded = await uploadTheme(secondRequest, 'warnings.zip').expect(200);
    assert.equal(uploaded.body.themes[0].name, 'warnings');
    assert.equal(await fs.pathExists(path.join(secondThemesPath, 'warnings')), true);
    assert.equal(await fs.pathExists(path.join(firstThemesPath, 'warnings')), false);

    const listed = await secondRequest
      .get(localUtils.API.getApiQuery('themes/'))
      .set('Origin', config.get('url'))
      .expect(200);
    const listedNames: string[] = listed.body.themes.map((theme: { name: string }) => theme.name);
    assert.deepEqual(listedNames.sort(), ['source', 'warnings']);

    await secondRequest
      .del(localUtils.API.getApiQuery('themes/warnings'))
      .set('Origin', config.get('url'))
      .expect(204);
    assert.equal(await fs.pathExists(path.join(secondThemesPath, 'warnings')), false);
  });
});
