import assert from 'node:assert/strict';
import { z } from 'zod';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// A list field offers options its publisher chose and takes one or several of them. Its options and
// whether it takes several are the field's settings; an answer is the text of each option picked.
describe('List custom fields', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
  };

  const ANIMALS = { options: ['Dog', 'Cat'], multiple: true };

  async function createList(settings: unknown, name = 'Favourite animals', status = 201) {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type: 'list', settings }] })
      .expectStatus(status);
    return status === 201 ? body.members_metafields[0] : body.errors[0];
  }

  async function editSettings(key: string, settings: unknown, status = 200) {
    const { body } = await agent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [{ settings }] })
      .expectStatus(status);
    return status === 200 ? body.members_metafields[0] : body.errors[0];
  }

  let memberCounter = 0;
  async function createMember(): Promise<string> {
    memberCounter += 1;
    const { body } = await agent
      .post('members/')
      .body({ members: [{ email: `list-field-${memberCounter}@example.com` }] })
      .expectStatus(201);
    return body.members[0].id;
  }

  async function readValues(memberId: string) {
    const { body } = await agent.get(`members/${memberId}/`).expectStatus(200);
    return body.members[0].metafields?.custom ?? {};
  }

  async function setValues(memberId: string, values: Record<string, unknown>, status = 200) {
    const { body } = await agent
      .put(`members/${memberId}/`)
      .body({ members: [{ metafields: { custom: values } }] })
      .expectStatus(status);
    return status === 200 ? body : body.errors[0];
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').del();
    await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
  });

  describe('Settings', function () {
    it('creates a list field with its options and whether it takes several', async function () {
      const field = await createList(ANIMALS);

      assert.equal(field.type, 'list');
      assert.deepEqual(field.settings, ANIMALS);

      const { body } = await agent.get(`members/metafields/custom/${field.key}/`).expectStatus(200);
      assert.deepEqual(body.members_metafields[0].settings, ANIMALS);
    });

    it('gives every other type no settings', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text' }] })
        .expectStatus(201);
      assert.equal(body.members_metafields[0].settings, null);
    });

    it('keeps an option as written, apart from its surrounding spaces', async function () {
      const field = await createList({ options: ['  Film & TV ', 'cooking'], multiple: false });
      assert.deepEqual(field.settings.options, ['Film & TV', 'cooking']);
    });

    for (const [settings, message] of [
      [undefined, 'Give the list its options.'],
      [{ options: ['Dog'], multiple: true }, 'Give the list at least 2 options.'],
      [{ options: ['Dog', 'Dog '], multiple: true }, 'Give each option once.'],
      [{ options: ['Dog', ''], multiple: true }, 'Enter text for each option.'],
      [{ options: ['Dog', 'Cat | Mouse'], multiple: true }, "Options can't contain |."],
      [
        { options: ['Dog', 'x'.repeat(256)], multiple: true },
        'Use 255 characters or fewer for each option.',
      ],
      [
        { options: Array.from({ length: 101 }, (_, n) => `Option ${n}`), multiple: true },
        'Give the list 100 options or fewer.',
      ],
      [{ options: ['Dog', 'Cat'] }, 'Say whether members can pick more than one option.'],
    ] as const) {
      it(`refuses a list set up with ${JSON.stringify(settings)?.slice(0, 60)}`, async function () {
        const error = await createList(settings, 'Favourite animals', 422);
        assert.equal(error.context, message);
        assert.match(error.property, /^settings/);
      });
    }

    it('refuses settings on a type that has none', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text', settings: ANIMALS }] })
        .expectStatus(422);
      assert.equal(body.errors[0].context, 'Only a list field has settings.');
    });

    it('changes the options and whether a member picks several', async function () {
      const field = await createList(ANIMALS);

      const edited = await editSettings(field.key, {
        options: ['Cat', 'Dog', 'Fish'],
        multiple: false,
      });

      assert.deepEqual(edited.settings, { options: ['Cat', 'Dog', 'Fish'], multiple: false });
    });

    it('refuses an edit whose settings are wrong, changing nothing it asked for', async function () {
      const field = await createList(ANIMALS);

      const { body: refused } = await agent
        .put(`members/metafields/custom/${field.key}/`)
        .body({
          members_metafields: [{ name: 'Animals', settings: { options: ['Dog'], multiple: true } }],
        })
        .expectStatus(422);

      assert.equal(refused.errors[0].context, 'Give the list at least 2 options.');
      const { body } = await agent.get(`members/metafields/custom/${field.key}/`).expectStatus(200);
      assert.equal(body.members_metafields[0].name, 'Favourite animals');
      assert.deepEqual(body.members_metafields[0].settings, ANIMALS);
    });

    // Rules apply when settings are written, so tightening one later never hides a field.
    it('still lists a field whose stored settings a write would now refuse', async function () {
      const field = await createList(ANIMALS);
      await models.Base.knex('members_metafields')
        .where('key', field.key)
        .update({ settings: JSON.stringify({ options: ['Dog'], multiple: true }) });

      const { body } = await agent.get('members/metafields/custom/').expectStatus(200);

      assert.deepEqual(body.members_metafields[0].settings, { options: ['Dog'], multiple: true });
    });

    it('refuses settings on a field whose type has none', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text' }] })
        .expectStatus(201);

      const error = await editSettings(body.members_metafields[0].key, ANIMALS, 422);
      assert.equal(error.context, 'Only a list field has settings.');
    });

    it('records changing the options in the history, and not re-sending them unchanged', async function () {
      const field = await createList(ANIMALS);
      await editSettings(field.key, ANIMALS);
      await editSettings(field.key, { ...ANIMALS, multiple: false });

      const { body } = await agent
        .get('actions/?filter=resource_type:member_custom_field')
        .expectStatus(200);
      const Context = z.object({ primary_name: z.string(), key: z.string() });
      const edits = body.actions.filter((action: { event: string }) => action.event === 'edited');

      assert.equal(edits.length, 1);
      assert.deepEqual(Context.parse(JSON.parse(edits[0].context)), {
        primary_name: field.name,
        key: field.key,
      });
    });
  });

  describe('Answers', function () {
    it('keeps the options picked, read back in the order the field offers them', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Fish'], multiple: true });
      const memberId = await createMember();

      await setValues(memberId, { [field.key]: ['Fish', 'Dog'] });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Dog', 'Fish'] });
    });

    it('is a list even when the field takes one option', async function () {
      const field = await createList({ ...ANIMALS, multiple: false });
      const memberId = await createMember();

      await setValues(memberId, { [field.key]: ['Cat'] });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Cat'] });
    });

    it('replaces what a member held with the options a write picks', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Fish'], multiple: true });
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dog', 'Cat'] });

      await setValues(memberId, { [field.key]: ['Fish'] });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Fish'] });
    });

    it('picks an option once however often a write names it', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();

      await setValues(memberId, { [field.key]: ['Dog', 'Dog'] });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Dog'] });
    });

    it('matches an option whatever its surrounding spaces or how its accents are encoded', async function () {
      const field = await createList({ options: ['Café', 'Bar'], multiple: true });
      const memberId = await createMember();

      // An e followed by a combining accent, as some systems type it, reads as é.
      await setValues(memberId, { [field.key]: [' Café '] });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Café'] });
    });

    it('tells an option from one that differs only in case', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();

      const error = await setValues(memberId, { [field.key]: ['dog'] }, 422);

      assert.equal(error.context, 'Choose from the options this field offers.');
      assert.equal(error.property, `metafields.custom.${field.key}`);
    });

    it('refuses more than one option for a field that takes one', async function () {
      const field = await createList({ ...ANIMALS, multiple: false });
      const memberId = await createMember();

      const error = await setValues(memberId, { [field.key]: ['Dog', 'Cat'] }, 422);

      assert.equal(error.context, 'Choose one option.');
    });

    it('refuses an answer that is not a list', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();

      const error = await setValues(memberId, { [field.key]: 'Dog' }, 422);

      assert.equal(error.context, 'Choose from the options this field offers.');
    });

    for (const cleared of [[], null]) {
      it(`clears the field when a write picks ${JSON.stringify(cleared)}`, async function () {
        const field = await createList(ANIMALS);
        const memberId = await createMember();
        await setValues(memberId, { [field.key]: ['Dog'] });

        await setValues(memberId, { [field.key]: cleared });

        assert.deepEqual(await readValues(memberId), {});
      });
    }
  });

  describe('When the options change', function () {
    it('keeps an answer to an option the field no longer offers, read after the ones it does', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Dolphin'], multiple: true });
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dolphin', 'Dog'] });

      await editSettings(field.key, ANIMALS);

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Dog', 'Dolphin'] });
    });

    it('refuses a write naming an option the field no longer offers', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Dolphin'], multiple: true });
      const memberId = await createMember();
      await editSettings(field.key, ANIMALS);

      const error = await setValues(memberId, { [field.key]: ['Dolphin'] }, 422);

      assert.equal(error.context, 'Choose from the options this field offers.');
    });

    it('takes an answer back as that option when the same text is offered again', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Dolphin'], multiple: true });
      const holder = await createMember();
      await setValues(holder, { [field.key]: ['Dolphin'] });
      await editSettings(field.key, ANIMALS);

      await editSettings(field.key, { options: ['Dolphin', 'Dog', 'Cat'], multiple: true });
      const another = await createMember();
      await setValues(another, { [field.key]: ['Dolphin', 'Cat'] });

      assert.deepEqual(await readValues(holder), { [field.key]: ['Dolphin'] });
      assert.deepEqual(await readValues(another), { [field.key]: ['Dolphin', 'Cat'] });
    });

    it('keeps every option a member held when the field changes to take one', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dog', 'Cat'] });

      await editSettings(field.key, { ...ANIMALS, multiple: false });

      assert.deepEqual(await readValues(memberId), { [field.key]: ['Dog', 'Cat'] });

      await setValues(memberId, { [field.key]: ['Cat'] });
      assert.deepEqual(await readValues(memberId), { [field.key]: ['Cat'] });
    });
  });

  describe('Options members hold', function () {
    const heldOptions = async (key: string) => {
      const { body } = await agent
        .get(`members/metafields/custom/${key}/held-options/`)
        .expectStatus(200);
      return [...body.held_options].sort();
    };

    it('names each option members hold once, including ones the field no longer offers', async function () {
      const field = await createList({ options: ['Dog', 'Cat', 'Dolphin'], multiple: true });
      await setValues(await createMember(), { [field.key]: ['Dog', 'Dolphin'] });
      await setValues(await createMember(), { [field.key]: ['Dog'] });
      await editSettings(field.key, ANIMALS);

      assert.deepEqual(await heldOptions(field.key), ['Dog', 'Dolphin']);
    });

    it('names none for a list nobody has answered', async function () {
      const field = await createList(ANIMALS);
      assert.deepEqual(await heldOptions(field.key), []);
    });

    it('refuses a field that is not a list, and one that does not exist', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text' }] })
        .expectStatus(201);

      await agent
        .get(`members/metafields/custom/${body.members_metafields[0].key}/held-options/`)
        .expectStatus(422);
      await agent.get('members/metafields/custom/nothing_here/held-options/').expectStatus(404);
    });

    // What members answered is about members, so it takes being able to browse them.
    it('is not shown to a role that cannot browse members', async function () {
      const field = await createList(ANIMALS);
      await agent.loginAsEditor();
      try {
        await agent.get(`members/metafields/custom/${field.key}/held-options/`).expectStatus(403);
      } finally {
        await agent.loginAsOwner();
      }
    });
  });
});
