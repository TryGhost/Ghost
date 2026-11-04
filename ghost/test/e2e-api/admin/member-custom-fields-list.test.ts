import assert from 'node:assert/strict';
import { z } from 'zod';

const {
  agentProvider,
  fixtureManager,
  mockManager,
  hostLimits,
} = require('../../utils/e2e-framework');
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
      assert.equal('settings' in body.members_metafields[0], false);
    });

    it('keeps an option as written, apart from its surrounding spaces', async function () {
      const field = await createList({ options: ['  Film & TV ', 'cooking'], multiple: false });
      assert.deepEqual(field.settings.options, ['Film & TV', 'cooking']);
    });

    // Each refusal names the setting it is about by its path, down to the option, so a form can
    // show it beside the input that set it.
    for (const [settings, message, property] of [
      [undefined, 'Give the list its options.', 'settings'],
      [
        { options: ['Dog'], multiple: true },
        'Give the list at least 2 options.',
        'settings.options',
      ],
      [
        { options: ['Dog', 'Dog '], multiple: true },
        'This option already exists.',
        'settings.options.1',
      ],
      [
        { options: ['Dog', 'dog'], multiple: true },
        'This option already exists.',
        'settings.options.1',
      ],
      [
        { options: ['Dog', ''], multiple: true },
        'Enter text for each option.',
        'settings.options.1',
      ],
      [
        { options: ['Dog', 'Cat | Mouse'], multiple: true },
        "Options can't contain |.",
        'settings.options.1',
      ],
      [
        { options: ['Dog', 'x'.repeat(256)], multiple: true },
        'Use 255 characters or fewer for each option.',
        'settings.options.1',
      ],
      [
        { options: Array.from({ length: 101 }, (_, n) => `Option ${n}`), multiple: true },
        'Give the list 100 options or fewer.',
        'settings.options',
      ],
      [
        { options: ['Dog', 'Cat'] },
        'Say whether members can pick more than one option.',
        'settings.multiple',
      ],
    ] as const) {
      it(`refuses a list set up with ${JSON.stringify(settings)?.slice(0, 60)}`, async function () {
        const error = await createList(settings, 'Favourite animals', 422);
        assert.equal(error.context, message);
        assert.equal(error.property, property);
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

      // Read back in the order the edit gave, not the order the options were first saved in.
      const { body } = await agent.get(`members/metafields/custom/${field.key}/`).expectStatus(200);
      assert.deepEqual(body.members_metafields[0].settings, {
        options: ['Cat', 'Dog', 'Fish'],
        multiple: false,
      });
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
      assert.equal(refused.errors[0].property, 'settings.options');
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

    // Against the field rather than a position in the list, which a client would read as an
    // option named by a number.
    for (const answer of ['Dog', [42]]) {
      it(`refuses ${JSON.stringify(answer)}, which is not a list of options, against the field`, async function () {
        const field = await createList(ANIMALS);
        const memberId = await createMember();

        const error = await setValues(memberId, { [field.key]: answer }, 422);

        assert.equal(error.context, 'Choose from the options this field offers.');
        assert.equal(error.property, `metafields.custom.${field.key}`);
      });
    }

    it('clears the field when a write gives null', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dog'] });

      await setValues(memberId, { [field.key]: null });

      assert.deepEqual(await readValues(memberId), {});
    });

    // A value is never empty, so a list picking nothing is refused rather than a second way to
    // clear.
    it('refuses a write that picks nothing', async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dog'] });

      const error = await setValues(memberId, { [field.key]: [] }, 422);

      assert.equal(error.context, 'Choose at least one option, or send null to clear it.');
      assert.deepEqual(await readValues(memberId), { [field.key]: ['Dog'] });
    });
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

  // Ghost checks a list's settings every time it writes them, so settings Ghost can't read were
  // damaged outside Ghost, or by a later release that reads settings differently. The field keeps
  // working with a new list's default settings until the next write of its settings replaces them.
  describe("Settings Ghost can't read", function () {
    const NEW_LIST = { options: [], multiple: false };
    const damage = (key: string, change: Record<string, unknown>) =>
      models.Base.knex('members_metafields').where({ namespace: 'custom', key }).update(change);
    const listedKeys = async () => {
      const { body } = await agent.get('members/metafields/custom/').expectStatus(200);
      return body.members_metafields.map((field: { key: string }) => field.key);
    };

    it("reads the field with a new list's settings, and keeps what members hold", async function () {
      const field = await createList(ANIMALS);
      const memberId = await createMember();
      await setValues(memberId, { [field.key]: ['Dog', 'Cat'] });
      await damage(field.key, { settings: 'not json' });

      const { body } = await agent.get(`members/metafields/custom/${field.key}/`).expectStatus(200);
      assert.deepEqual(body.members_metafields[0].settings, NEW_LIST);
      assert.deepEqual(await listedKeys(), [field.key]);
      // Both answers are kept. A list's answers come back in the order of the list's options, and
      // a list read with its defaults has no options, so the test doesn't check the order.
      const { [field.key]: held } = await readValues(memberId);
      assert.deepEqual([...held].sort(), ['Cat', 'Dog']);
    });

    it('takes the settings the next edit writes', async function () {
      const field = await createList(ANIMALS);
      await damage(field.key, { settings: JSON.stringify({ options: 'Dog' }) });

      assert.deepEqual((await editSettings(field.key, ANIMALS)).settings, ANIMALS);
      const { body } = await agent.get(`members/metafields/custom/${field.key}/`).expectStatus(200);
      assert.deepEqual(body.members_metafields[0].settings, ANIMALS);
    });

    it('leaves out a field of a type this release does not know, and lists the others', async function () {
      const retired = await createList(ANIMALS);
      const kept = await createList(ANIMALS, 'Favourite foods');
      await damage(retired.key, { type: 'retired_type' });

      assert.deepEqual(await listedKeys(), [kept.key]);
      await agent.get(`members/metafields/custom/${retired.key}/`).expectStatus(404);
    });
  });

  describe('Values members hold', function () {
    const heldValues = async (key: string) => {
      const { body } = await agent
        .get(`members/metafields/custom/${key}/values/`)
        .expectStatus(200);
      return body.values.map(({ value }: { value: string }) => value);
    };

    it('names each option members hold once, sorted by text, including ones the field no longer offers', async function () {
      const field = await createList({ options: ['Dolphin', 'Dog', 'Cat'], multiple: true });
      await setValues(await createMember(), { [field.key]: ['Dolphin', 'Dog'] });
      await setValues(await createMember(), { [field.key]: ['Dog'] });
      await setValues(await createMember(), { [field.key]: ['Cat'] });
      await editSettings(field.key, ANIMALS);

      assert.deepEqual(await heldValues(field.key), ['Cat', 'Dog', 'Dolphin']);
    });

    it('names none for a list nobody has answered', async function () {
      const field = await createList(ANIMALS);
      assert.deepEqual(await heldValues(field.key), []);
    });

    it('refuses a field that is not a list, and one that does not exist', async function () {
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Company', type: 'short_text' }] })
        .expectStatus(201);

      await agent
        .get(`members/metafields/custom/${body.members_metafields[0].key}/values/`)
        .expectStatus(422);
      await agent.get('members/metafields/custom/nothing_here/values/').expectStatus(404);
    });

    it('is not shown to a role that cannot browse members', async function () {
      const field = await createList(ANIMALS);
      await agent.loginAsEditor();
      try {
        await agent.get(`members/metafields/custom/${field.key}/values/`).expectStatus(403);
      } finally {
        await agent.loginAsOwner();
      }
    });

    it('is not found for an archived field, or for any field while the host switches custom fields off', async function () {
      const archived = await createList(ANIMALS);
      await setValues(await createMember(), { [archived.key]: ['Cat'] });
      await agent
        .put(`members/metafields/custom/${archived.key}/`)
        .body({ members_metafields: [{ status: 'archived' }] })
        .expectStatus(200);
      await agent.get(`members/metafields/custom/${archived.key}/values/`).expectStatus(404);

      const active = await createList(ANIMALS, 'Favourite foods');
      await setValues(await createMember(), { [active.key]: ['Dog'] });
      await hostLimits.setHostLimits({ limitCustomFields: { disabled: true } });
      try {
        await agent.get(`members/metafields/custom/${active.key}/values/`).expectStatus(404);
      } finally {
        await hostLimits.restoreHostLimits();
      }
    });

    it("reads what members hold of a list whose settings Ghost can't read", async function () {
      const field = await createList(ANIMALS);
      await setValues(await createMember(), { [field.key]: ['Cat'] });
      await models.Base.knex('members_metafields')
        .where({ namespace: 'custom', key: field.key })
        .update({ settings: 'not json' });

      assert.deepEqual(await heldValues(field.key), ['Cat']);
    });
  });
});
