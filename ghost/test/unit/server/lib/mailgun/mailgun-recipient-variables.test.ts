import assert from 'node:assert/strict';

import {
  createRecipientVariables,
  getHtmlEscapedIds,
  replaceTokensWithRecipientVariables,
} from '../../../../../core/server/lib/mailgun/mailgun-recipient-variables';

const definitions = [
  { id: 'name', token: /%%\{name\}%%/g },
  { id: 'first_name_2', token: /%%\{first_name, (?:"|&quot;)friend(?:"|&quot;)\}%%/g },
  { id: 'unsubscribe_url', token: /%%\{unsubscribe_url\}%%/g, trusted: true },
  { id: 'uuid', token: /%%\{uuid\}%%/g, trusted: true },
];

const content =
  'Hi %%{name}%% / %%{first_name, "friend"}%% <a href="%%{unsubscribe_url}%%?u=%%{uuid}%%">x</a> %%{name}%%';

describe('Mailgun recipient variables', function () {
  describe('replaceTokensWithRecipientVariables', function () {
    it('points the html body at the escaped copy of values that are not trusted', function () {
      assert.equal(
        replaceTokensWithRecipientVariables(content, definitions, 'html'),
        'Hi %recipient.name_html% / %recipient.first_name_2_html% <a href="%recipient.unsubscribe_url%?u=%recipient.uuid%">x</a> %recipient.name_html%',
      );
    });

    for (const format of ['plaintext', 'subject'] as const) {
      it(`points the ${format} at the unescaped values`, function () {
        assert.equal(
          replaceTokensWithRecipientVariables(content, definitions, format),
          'Hi %recipient.name% / %recipient.first_name_2% <a href="%recipient.unsubscribe_url%?u=%recipient.uuid%">x</a> %recipient.name%',
        );
      });
    }
  });

  describe('createRecipientVariables', function () {
    const htmlEscapedIds = getHtmlEscapedIds(definitions);

    it('adds an escaped copy only for values that are not trusted', function () {
      const variables = createRecipientVariables(
        [
          { id: 'name', value: '<b>Tom & "Jo"</b>' },
          { id: 'first_name_2', value: 'friend' },
          { id: 'unsubscribe_url', value: 'https://example.com/unsubscribe/?uuid=abc&key=def' },
          { id: 'uuid', value: 'abc' },
        ],
        htmlEscapedIds,
      );

      assert.deepEqual(variables, {
        name: '<b>Tom & "Jo"</b>',
        name_html: '&lt;b&gt;Tom &amp; &quot;Jo&quot;&lt;/b&gt;',
        first_name_2: 'friend',
        first_name_2_html: 'friend',
        unsubscribe_url: 'https://example.com/unsubscribe/?uuid=abc&key=def',
        uuid: 'abc',
      });
    });

    it('copies values that are not strings as they are', function () {
      assert.deepEqual(createRecipientVariables([{ id: 'name', value: null }], htmlEscapedIds), {
        name: null,
        name_html: null,
      });
    });
  });
});
