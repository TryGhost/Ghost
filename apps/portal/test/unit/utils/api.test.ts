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
    test('asks the members API for the fields open to members', async () => {
      const listed = [
        {
          key: 'nickname',
          name: 'Nickname',
          type: 'short_text',
          settings: null,
          access: { member: 'write' },
        },
        {
          key: 'shipping_address',
          name: 'Shipping address',
          type: 'address',
          settings: null,
          access: { member: 'read' },
        },
      ];
      const fetchSpy = respond(200, { members_metafields: listed });

      expect(await api.member.customFields()).toEqual(listed);
      expect(fetchSpy.mock.calls[0]?.[0]).toBe(
        'https://example.com/members/api/member/metafields/custom/',
      );
    });

    test('is empty when the site cannot answer', async () => {
      respond(404, {});
      expect(await api.member.customFields()).toEqual([]);
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
