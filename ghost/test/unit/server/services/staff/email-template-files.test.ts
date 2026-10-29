import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';
import { IncorrectUsageError } from '@tryghost/errors';
import { createStaffEmailTemplateFiles } from '../../../../../core/server/services/staff/email-template-files';
import { staffEmailTemplateFiles } from '../../../../utils/staff-email-template-files';

const directory = path.join(__dirname, '../../../../../core/server/services/staff/email-templates');

function hbsNames(folder: string): string[] {
  return readdirSync(folder)
    .filter((file) => file.endsWith('.hbs'))
    .map((file) => file.replace(/\.hbs$/, ''))
    .sort();
}

describe('Staff email template files', function () {
  it('reads a known template through the supplied reader by its file name', async function () {
    const readFile = sinon.stub().resolves('<p>{{siteTitle}}</p>');
    const files = createStaffEmailTemplateFiles({ readFile, readFileSync: sinon.stub() });

    assert.equal(await files.readTemplate('new-free-signup'), '<p>{{siteTitle}}</p>');

    sinon.assert.calledOnceWithExactly(readFile, 'new-free-signup.hbs');
  });

  for (const name of [
    'not-a-template',
    '../index',
    'partials/styles',
    '__proto__',
    'constructor',
  ]) {
    it(`rejects ${name} without reading`, async function () {
      const readFile = sinon.stub().resolves('');
      const files = createStaffEmailTemplateFiles({ readFile, readFileSync: sinon.stub() });

      await assert.rejects(files.readTemplate(name), IncorrectUsageError);

      sinon.assert.notCalled(readFile);
    });
  }

  it('reads the shared partials synchronously by name', function () {
    const readFileSync = sinon.stub().callsFake((file: string) => `source of ${file}`);
    const files = createStaffEmailTemplateFiles({ readFile: sinon.stub(), readFileSync });

    assert.deepEqual(files.readPartials(), [
      { name: 'preview', source: 'source of partials/preview.hbs' },
      { name: 'styles', source: 'source of partials/styles.hbs' },
    ]);
  });

  it('covers exactly the HTML templates and partials in the template directory', async function () {
    const partials = staffEmailTemplateFiles.readPartials();
    assert.deepEqual(
      partials.map(({ name }) => name),
      hbsNames(path.join(directory, 'partials')),
    );
    for (const { source } of partials) {
      assert.ok(source.length > 0);
    }

    for (const name of hbsNames(directory)) {
      assert.ok((await staffEmailTemplateFiles.readTemplate(name)).includes('{{> styles}}'), name);
    }
    const readFile = sinon.stub().resolves('');
    const files = createStaffEmailTemplateFiles({ readFile, readFileSync: sinon.stub() });
    for (const name of hbsNames(directory)) {
      await files.readTemplate(name);
    }
    assert.deepEqual(
      readFile.args.map(([file]) => file),
      hbsNames(directory).map((name) => `${name}.hbs`),
    );
  });
});
