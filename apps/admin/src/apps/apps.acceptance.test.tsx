import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { currentRoute, fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { activateApp, resetAppActivation } from './app-activation';
import { appsScreen } from './apps.screen';
import { createEpisode, createPodcast, resetPodcastsStore } from './podcasts/podcasts-store';
import { sidebarScreen } from '@/layout/sidebar.screen';

const podcastInput = {
  title: 'The Daily Awesome',
  description: 'A show about awesome things',
  author: 'Jamie',
  website: '',
  artworkUrl: '',
};

describe('Apps', () => {
  beforeEach(() => {
    resetAppActivation();
    resetPodcastsStore();
  });

  describe('with the apps flag off', () => {
    it('hides the Apps nav item and 404s the route', async () => {
      await renderAdminApp('/apps', { labs: { apps: false } });

      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      await expect.element(sidebarScreen.navLink('Apps')).not.toBeInTheDocument();
      await expect.element(appsScreen.page()).not.toBeInTheDocument();
      await expect
        .element(sidebarScreen.shellMain().getByRole('heading', { name: 'Page not found' }))
        .toBeVisible();
    });
  });

  describe('with the apps flag on', () => {
    it('shows the Apps nav item and lists the Podcasts app card', async () => {
      await renderAdminApp('/apps', { labs: { apps: true } });

      await expect.element(sidebarScreen.navLink('Apps')).toBeVisible();
      await expect.element(appsScreen.page()).toBeVisible();
      await expect.element(appsScreen.card('podcasts')).toHaveTextContent('Podcasts');
      await expect.element(appsScreen.activateLink('podcasts')).toBeVisible();
      await expect.element(appsScreen.manageLink('podcasts')).not.toBeInTheDocument();
    });

    it('activates Podcasts through the activation flow and switches the card to Manage', async () => {
      await renderAdminApp('/apps', { labs: { apps: true } });

      await appsScreen.activateLink('podcasts').click();
      await expect.element(appsScreen.activateFlow()).toBeVisible();
      expect(currentRoute()).toBe('/apps/podcasts/activate');

      // One step: what the app adds, and a single button to turn it on
      await expect.element(appsScreen.activateHighlights()).toBeVisible();
      await expect.element(appsScreen.activateButton()).toHaveTextContent('Activate Podcasts');
      await appsScreen.activateButton().click();

      await expect.element(appsScreen.podcastsList()).toBeVisible();
      expect(currentRoute()).toBe('/apps/podcasts');
      await expect.element(appsScreen.noPodcastsHeading()).toBeVisible();

      await sidebarScreen.navLink('Apps').click();
      await expect.element(appsScreen.manageLink('podcasts')).toBeVisible();
      await expect.element(appsScreen.cardActiveBadge('podcasts')).toBeVisible();
      await expect.element(appsScreen.activateLink('podcasts')).not.toBeInTheDocument();
    });

    it('prompts activation on the Podcasts page while the app is inactive', async () => {
      await renderAdminApp('/apps/podcasts', { labs: { apps: true } });

      await expect.element(appsScreen.podcastsInactive()).toBeVisible();
      await expect.element(appsScreen.podcastsList()).not.toBeInTheDocument();
    });

    it('can deactivate Podcasts from the podcasts page', async () => {
      activateApp('podcasts');
      await renderAdminApp('/apps/podcasts', { labs: { apps: true } });

      await appsScreen.podcastsAppActions().click();
      await appsScreen.deactivatePodcastsItem().click();

      await expect.element(appsScreen.page()).toBeVisible();
      await expect.element(appsScreen.activateLink('podcasts')).toBeVisible();
    });
  });

  describe('Editorial board', () => {
    it('is hidden from the main nav and prompts activation until activated', async () => {
      await renderAdminApp('/editorial-board', { labs: { apps: true } });

      await expect.element(sidebarScreen.navLink('Editorial board')).not.toBeInTheDocument();
      await expect.element(appsScreen.editorialBoardInactive()).toBeVisible();
      await expect.element(appsScreen.editorialBoardPage()).not.toBeInTheDocument();
    });

    it('activates from the Apps page straight into the board, with a primary nav item', async () => {
      await renderAdminApp('/apps', { labs: { apps: true } });

      await appsScreen.activateLink('editorial-board').click();
      await expect
        .element(appsScreen.activateButton())
        .toHaveTextContent('Activate Editorial board');
      await appsScreen.activateButton().click();

      // No settings page: activation lands on the board itself
      await expect.element(appsScreen.editorialBoardPage()).toBeVisible();
      expect(currentRoute()).toBe('/editorial-board');
      await expect.element(sidebarScreen.navLink('Editorial board')).toBeVisible();

      // The nav item stays wherever you go
      await sidebarScreen.navLink('Apps').click();
      await expect.element(sidebarScreen.navLink('Editorial board')).toBeVisible();
      // Manage on the app card also opens the board
      await expect
        .element(appsScreen.manageLink('editorial-board'))
        .toHaveAttribute('href', '#/editorial-board');
    });

    it('shows the mocked board as stage columns with cards', async () => {
      activateApp('editorial-board');
      await renderAdminApp('/editorial-board', { labs: { apps: true } });

      await expect(appsScreen.editorialBoardColumns()).toHaveCount(6);
      await expect.element(appsScreen.editorialBoardColumns().first()).toHaveTextContent('Idea');
      await expect.element(appsScreen.editorialBoardCards().first()).toBeVisible();
      await expect.element(appsScreen.editorialBoardTray()).not.toBeInTheDocument();
    });

    it('can be deactivated from its card on the Apps page', async () => {
      activateApp('editorial-board');
      await renderAdminApp('/apps', { labs: { apps: true } });

      await expect.element(sidebarScreen.navLink('Editorial board')).toBeVisible();
      await appsScreen.cardActions('Editorial board').click();
      await appsScreen.deactivateItem('Editorial board').click();

      await expect.element(appsScreen.activateLink('editorial-board')).toBeVisible();
      await expect.element(appsScreen.cardActions('Editorial board')).not.toBeInTheDocument();
      await expect.element(sidebarScreen.navLink('Editorial board')).not.toBeInTheDocument();
    });
  });

  describe('Podcasts CRUD', () => {
    beforeEach(() => {
      activateApp('podcasts');
    });

    it('creates, manages and deletes a podcast', async () => {
      await renderAdminApp('/apps/podcasts', { labs: { apps: true } });
      await expect.element(appsScreen.noPodcastsHeading()).toBeVisible();
      // The empty state owns the call to action; the header CTA only appears with podcasts.
      await expect.element(appsScreen.newPodcastLink()).not.toBeInTheDocument();

      // Create
      await appsScreen.createFirstPodcastLink().click();
      await expect.element(appsScreen.podcastForm()).toBeVisible();
      await expect.element(appsScreen.podcastFormTitle()).toHaveTextContent('New podcast');
      await appsScreen.podcastFormSave().click();
      await expect.element(appsScreen.podcastForm()).toHaveTextContent('A podcast needs a title.');
      await appsScreen.podcastTitleInput().fill('The Daily Awesome');
      await appsScreen.podcastFormSave().click();

      // Lands on the podcast's episodes with an Apps > Podcasts > Title breadcrumb
      await expect.element(appsScreen.episodesList()).toBeVisible();
      await expect.element(appsScreen.podcastTitle()).toHaveTextContent('The Daily Awesome');
      await expect.element(appsScreen.noEpisodesHeading()).toBeVisible();

      // Manage = podcast metadata. Saving stays on the page and reports Saved.
      await appsScreen.podcastManageLink().click();
      await expect.element(appsScreen.podcastFormTitle()).toHaveTextContent('Manage');
      await expect.element(appsScreen.podcastTitleInput()).toHaveValue('The Daily Awesome');
      await appsScreen.podcastTitleInput().fill('The Weekly Awesome');
      await appsScreen.podcastFormSave().click();
      await expect.element(appsScreen.podcastFormSave()).toHaveTextContent('Saved');
      await expect.element(appsScreen.podcastForm()).toBeVisible();

      // Back to the list through the breadcrumb, then delete from the row menu
      await appsScreen.podcastForm().getByRole('link', { name: 'Podcasts', exact: true }).click();
      await expect.element(appsScreen.podcastRows()).toHaveTextContent('The Weekly Awesome');
      await expect.element(appsScreen.newPodcastLink()).toBeVisible();
      await appsScreen.podcastRowActions('The Weekly Awesome').click();
      await appsScreen.deleteMenuItem().click();
      await expect.element(appsScreen.confirmDeleteDialog()).toBeVisible();
      await appsScreen.confirmDelete().click();
      await expect.element(appsScreen.noPodcastsHeading()).toBeVisible();
    });

    it('creates, manages and deletes an episode', async () => {
      const podcast = createPodcast(podcastInput);
      await renderAdminApp(`/apps/podcasts/${podcast.id}`, { labs: { apps: true } });
      await expect.element(appsScreen.noEpisodesHeading()).toBeVisible();
      // The empty state owns the call to action; the header CTA only appears with episodes.
      await expect.element(appsScreen.newEpisodeLink()).not.toBeInTheDocument();

      // Create
      await appsScreen.addFirstEpisodeLink().click();
      await expect.element(appsScreen.episodeForm()).toBeVisible();
      await expect.element(appsScreen.episodeFormTitle()).toHaveTextContent('New episode');
      await appsScreen.episodeTitleInput().fill('Episode 1');
      await appsScreen.episodeFormSave().click();

      // A new episode offers to start a post; declining returns to the list
      await expect.element(appsScreen.createPostDialog()).toBeVisible();
      await appsScreen.createPostDismiss().click();

      await expect.element(appsScreen.episodeRows()).toHaveTextContent('Episode 1');
      await expect.element(appsScreen.episodeRows()).toHaveTextContent('Draft');
      await expect.element(appsScreen.newEpisodeLink()).toBeVisible();

      // Manage = episode metadata, breadcrumb ends with the episode title.
      // Saving stays on the page and reports Saved.
      await appsScreen.podcastRowActions('Episode 1').click();
      await appsScreen.manageMenuItem().click();
      await expect.element(appsScreen.episodeFormTitle()).toHaveTextContent('Episode 1');
      await appsScreen.episodeTitleInput().fill('Episode One');
      await appsScreen.episodeFormSave().click();
      await expect.element(appsScreen.episodeFormSave()).toHaveTextContent('Saved');
      await expect.element(appsScreen.episodeFormTitle()).toHaveTextContent('Episode One');

      // Delete from the episode's own actions menu
      await appsScreen.episodeActions().click();
      await appsScreen.deleteEpisodeItem().click();
      await appsScreen.confirmDelete().click();
      await expect.element(appsScreen.noEpisodesHeading()).toBeVisible();
    });

    it('asks before leaving a podcast form with unsaved changes', async () => {
      const podcast = createPodcast(podcastInput);
      await renderAdminApp(`/apps/podcasts/${podcast.id}/manage`, { labs: { apps: true } });

      await appsScreen.podcastTitleInput().fill('Changed');
      await appsScreen.podcastForm().getByRole('link', { name: 'Podcasts', exact: true }).click();

      const dialog = page.getByRole('alertdialog');
      await expect.element(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Stay' }).click();
      await expect.element(appsScreen.podcastTitleInput()).toHaveValue('Changed');

      await appsScreen.podcastForm().getByRole('link', { name: 'Podcasts', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click();
      await expect.element(appsScreen.podcastsList()).toBeVisible();
      await expect.element(appsScreen.podcastRows()).toHaveTextContent('The Daily Awesome');
    });

    it('deletes a podcast from its manage page', async () => {
      const podcast = createPodcast(podcastInput);
      await renderAdminApp(`/apps/podcasts/${podcast.id}/manage`, { labs: { apps: true } });

      await appsScreen.podcastActions().click();
      await appsScreen.deletePodcastItem().click();
      await expect.element(appsScreen.confirmDeleteDialog()).toBeVisible();
      await appsScreen.confirmDelete().click();

      await expect.element(appsScreen.noPodcastsHeading()).toBeVisible();
    });

    it('starts a post with the new episode embedded', async () => {
      const podcast = createPodcast(podcastInput);
      const addPostApi = fakeAdminEndpoint('POST', /^\/posts\/(\?.*)?$/, {
        posts: [{ id: 'post-1', title: 'Episode 1', status: 'draft' }],
      });
      await renderAdminApp(`/apps/podcasts/${podcast.id}/episodes/new`, { labs: { apps: true } });

      await appsScreen.episodeTitleInput().fill('Episode 1');
      await appsScreen.episodeFormSave().click();
      await expect.element(appsScreen.createPostDialog()).toBeVisible();
      await appsScreen.createPostConfirm().click();

      await expect.poll(() => currentRoute()).toBe('/editor/post/post-1');
      const body = addPostApi.lastRequest?.body as { posts: { title: string; lexical: string }[] };
      expect(body.posts[0].title).toBe('Episode 1');
      const doc = JSON.parse(body.posts[0].lexical) as {
        root: { children: { type: string; title?: string; podcastTitle?: string }[] };
      };
      expect(doc.root.children[0]).toMatchObject({
        type: 'podcast',
        title: 'Episode 1',
        podcastTitle: 'The Daily Awesome',
      });
    });

    it('lists podcasts with their episode counts and opens a podcast from the list', async () => {
      const podcast = createPodcast(podcastInput);
      createEpisode(podcast.id, {
        title: 'Episode 1',
        description: '',
        audioUrl: '',
        duration: '10:00',
        status: 'published',
        publishedAt: '2026-09-22',
      });
      await renderAdminApp('/apps/podcasts', { labs: { apps: true } });

      await expect.element(appsScreen.podcastRows()).toHaveTextContent('1 episode');
      await appsScreen
        .podcastRows()
        .getByRole('link', { name: 'The Daily Awesome', exact: true })
        .click();

      await expect.element(appsScreen.episodesList()).toBeVisible();
      expect(currentRoute()).toBe(`/apps/podcasts/${podcast.id}`);
      await expect.element(appsScreen.episodeRows()).toHaveTextContent('Published');
    });

    it('deletes a podcast and its episodes from the podcast page', async () => {
      const podcast = createPodcast(podcastInput);
      createEpisode(podcast.id, {
        title: 'Episode 1',
        description: '',
        audioUrl: '',
        duration: '',
        status: 'draft',
        publishedAt: '',
      });
      await renderAdminApp(`/apps/podcasts/${podcast.id}`, { labs: { apps: true } });

      await appsScreen.podcastActions().click();
      await appsScreen.deletePodcastItem().click();
      await appsScreen.confirmDelete().click();

      await expect.element(appsScreen.podcastsList()).toBeVisible();
      await expect.element(appsScreen.noPodcastsHeading()).toBeVisible();
    });
  });
});
