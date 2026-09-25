import setupGhostApi from '../../../src/utils/api';
import { HumanReadableError } from '../../../src/utils/errors';

/** A fetch answering with one status and body. Shaped to what the client reads, not to
 *  the whole of `Response`, which a test would have to invent the rest of. */
const respond = (status: number, body: unknown) =>
  vi.spyOn(window, 'fetch').mockResolvedValue({
    ok: status < 400,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response);

describe('api.member', () => {
  const api = setupGhostApi({ siteUrl: 'https://example.com', apiUrl: '', apiKey: '' });

  /** `update` is inferred from JavaScript, so its signature wants every field. A test
   *  names the ones it is about and leaves the rest undefined, as a caller would. */
  const update = (data: Record<string, unknown>) =>
    api.member.update({
      name: undefined,
      subscribed: undefined,
      newsletters: undefined,
      enableCommentNotifications: undefined,
      enableUpdatesAndAnnouncements: undefined,
      metafields: undefined,
      ...data,
    });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('customFields', () => {
    test('asks the members API and keeps the fields open to members', async () => {
      const fetchSpy = respond(200, {
        members_metafields: [
          { key: 'nickname', name: 'Nickname', type: 'short_text', access: { member: 'write' } },
          {
            key: 'shipping_address',
            name: 'Shipping address',
            type: 'address',
            access: { member: 'read' },
          },
          { key: 'notes', name: 'Notes', type: 'short_text', access: { member: 'none' } },
          { key: 'legacy', name: 'Legacy', type: 'short_text' },
        ],
      });

      const fields = await api.member.customFields();

      expect(fetchSpy.mock.calls[0]?.[0]).toBe(
        'https://example.com/members/api/member/metafields/custom/',
      );
      expect(fields.map((field) => field.key)).toEqual(['nickname', 'shipping_address']);
    });

    test('is empty when the site cannot answer', async () => {
      respond(404, {});
      expect(await api.member.customFields()).toEqual([]);
    });

    // Portal and the site it talks to are deployed apart, so it can be answered by a
    // version that shapes this differently, or by something that is not this endpoint at
    // all. None of it should cost a member the page these fields are drawn on.
    test('is empty when the site answers with something else entirely', async () => {
      for (const body of [
        {},
        { members_metafields: null },
        { members_metafields: 'nonsense' },
        { members_metafields: [null, 'nope', { access: { member: 'write' } }] },
        // A name that is not text would be rendered as a child and take the page with it.
        {
          members_metafields: [
            { key: 'k', name: {}, type: 'short_text', access: { member: 'write' } },
          ],
        },
        { members_metafields: [{ key: 'k', name: 'Fine', type: 42, access: { member: 'write' } }] },
        {
          members_metafields: [
            { key: '', name: 'Fine', type: 'short_text', access: { member: 'write' } },
          ],
        },
        null,
      ]) {
        respond(200, body);
        expect(await api.member.customFields()).toEqual([]);
      }
    });

    test('is empty when the answer is not readable at all', async () => {
      vi.spyOn(window, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        json: async () => {
          throw new Error('not json');
        },
      } as unknown as Response);

      expect(await api.member.customFields()).toEqual([]);
    });
  });

  describe('update', () => {
    test('sends custom field values with the rest', async () => {
      const fetchSpy = respond(200, {});
      await update({ name: 'Jamie', metafields: { custom: { nickname: 'Jam' } } });

      const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
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

      await expect(update({ name: 'Jamie' })).rejects.toMatchObject({
        message: 'Enter a 2-letter country code, like US.',
        property: 'metafields.custom.shipping_address.country',
      });
      await expect(update({ name: 'Jamie' })).rejects.toBeInstanceOf(HumanReadableError);
    });
  });
});
