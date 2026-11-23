import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  configResponse,
  fakeEditorChrome,
  fakeEditorPost,
  renderAdminApp,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorBody } from '@tryghost/test-data/selectors/editor';

const POST_ID = 'abc123';

const IMAGE_CARD_LEXICAL = JSON.stringify({
  root: {
    children: [
      {
        type: 'image',
        version: 1,
        src: 'https://example.com/content/images/photo.jpg',
        width: 800,
        height: 600,
        title: '',
        alt: '',
        caption: '',
        cardWidth: 'regular',
        href: '',
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

// Admin can deploy ahead of the server, so a card's visibility settings
// appear only once the server lists the card in config.cardVisibility
function withCardVisibility(cardVisibility: string[]): RenderAdminAppOptions {
  const response = configResponse();
  return {
    boot: { browseConfig: { response: { config: { ...response.config, cardVisibility } } } },
  };
}

async function selectImageCard(options?: RenderAdminAppOptions) {
  fakeEditorChrome();
  fakeEditorPost({ id: POST_ID, lexical: IMAGE_CARD_LEXICAL });
  await renderAdminApp(`/editor/post/${POST_ID}`, options);

  const body = page.getByTestId(editorBody);
  const card = body.getByTestId('image-card-populated');
  await expect.element(card).toBeVisible();
  await card.click();

  // the image toolbar is hidden while a card is in edit mode
  const toolbarLink = body.getByRole('button', { name: 'Link', exact: true });
  await expect.element(toolbarLink).toBeVisible();

  return { body, card, toolbarLink };
}

describe('Card visibility settings', () => {
  it('are not offered for media cards on a server that does not list them', async () => {
    // configResponse() matches an older server: no cardVisibility
    const { body, card, toolbarLink } = await selectImageCard();

    await expect.element(body.getByTestId('edit-image-card')).not.toBeInTheDocument();

    await card.dblClick();

    await expect.element(toolbarLink).toBeVisible();
    await expect.element(page.getByTestId('visibility-settings')).not.toBeInTheDocument();
  });

  it('are offered for media cards the server lists', async () => {
    const { body, card } = await selectImageCard(
      withCardVisibility(['html', 'call-to-action', 'transistor', 'image']),
    );

    await expect.element(body.getByTestId('edit-image-card')).toBeVisible();

    await card.dblClick();

    await expect.element(page.getByTestId('visibility-settings').first()).toBeVisible();
  });
});
