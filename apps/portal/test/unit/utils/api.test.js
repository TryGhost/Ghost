import setupGhostApi from '../../../src/utils/api';
import { HumanReadableError } from '../../../src/utils/errors';

const respond = (status, body) =>
  vi.spyOn(window, 'fetch').mockResolvedValue({
    ok: status < 400,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  });

describe('api.member', () => {
  const api = setupGhostApi({ siteUrl: 'https://example.com' });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('customFields', () => {
    test('asks the members API and keeps the fields open to members', async () => {
      const fetchSpy = respond(200, {
        members_metafields: [
          { key: 'nickname', access: { member: 'write' } },
          { key: 'shipping_address', access: { member: 'read' } },
          { key: 'notes', access: { member: 'none' } },
          { key: 'legacy' },
        ],
      });

      const fields = await api.member.customFields();

      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://example.com/members/api/member/metafields/custom/',
      );
      expect(fields.map((field) => field.key)).toEqual(['nickname', 'shipping_address']);
    });

    test('is empty when the site cannot answer', async () => {
      respond(404, {});
      expect(await api.member.customFields()).toEqual([]);
    });
  });

  describe('update', () => {
    test('sends custom field values with the rest', async () => {
      const fetchSpy = respond(200, {});
      await api.member.update({ name: 'Jamie', metafields: { custom: { nickname: 'Jam' } } });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.metafields).toEqual({ custom: { nickname: 'Jam' } });
    });

    test('throws the reason the site refused, naming what it refused', async () => {
      respond(422, {
        errors: [
          {
            message: 'Enter a 2-letter country code, like US.',
            property: 'metafields.custom.shipping_address.country',
          },
        ],
      });

      await expect(api.member.update({ name: 'Jamie' })).rejects.toMatchObject({
        message: 'Enter a 2-letter country code, like US.',
        property: 'metafields.custom.shipping_address.country',
      });
      await expect(api.member.update({ name: 'Jamie' })).rejects.toBeInstanceOf(HumanReadableError);
    });
  });
});
