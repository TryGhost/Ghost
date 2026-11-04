import { Frame, serializers as frameworkSerializers } from '@tryghost/api-framework';

const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

const rules = [{ trigger_type: 'free_signup', scope: null, product_id: null, direction: null }];
const data = { name: 'Draft', description: '', status: 'inactive', actions: [], edges: [] };

describe('automation output serializers', () => {
  for (const method of ['add', 'edit', 'read']) {
    it(`${method} wraps rules and derived legacy fields in the response envelope`, async () => {
      const frame = new Frame();
      const automation = { ...data, id: 'id', trigger_rules: rules };
      await frameworkSerializers.handle.output(
        automation,
        { docName: 'automations', method },
        serializers.output,
        frame,
      );
      expect(frame.response).toEqual({
        automations: [{ ...automation, trigger_tier_scope: 'free', trigger_tier_ids: null }],
      });
      expect(automation).not.toHaveProperty('trigger_tier_scope');
    });
  }

  for (const method of ['add', 'edit', 'read']) {
    it.each(['free', 'specific_paid_tier'])(
      `${method} serialized "paid subscription changed" triggers to %s with null legacy trigger fields`,
      async (scope) => {
        const frame = new Frame();
        const automation = {
          ...data,
          id: 'id',
          trigger_rules: [
            {
              trigger_type: 'paid_subscription_changed',
              scope: scope === 'free' ? 'any_paid_tier' : 'specific_paid_tier',
              direction: 'from',
              product_id: scope === 'free' ? null : '64b6f7b7c8f1a2b3c4d5e6f7',
            },
            {
              trigger_type: 'paid_subscription_changed',
              scope,
              direction: 'to',
              product_id: scope === 'free' ? null : '64b6f7b7c8f1a2b3c4d5e6f8',
            },
          ],
        };
        await frameworkSerializers.handle.output(
          automation,
          { docName: 'automations', method },
          serializers.output,
          frame,
        );
        expect(frame.response).toEqual({
          automations: [{ ...automation, trigger_tier_scope: null, trigger_tier_ids: null }],
        });
      },
    );
  }

  it('leaves browse on the default output serializer', async () => {
    const frame = new Frame();
    const page = { data: [{ id: 'id', name: 'Draft' }], meta: { pagination: { total: 1 } } };
    await frameworkSerializers.handle.output(
      page,
      { docName: 'automations', method: 'browse' },
      serializers.output,
      frame,
    );
    expect(frame.response).toEqual({ automations: page.data, meta: page.meta });
  });
});
