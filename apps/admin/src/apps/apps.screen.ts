import { page } from 'vitest/browser';
import {
  activateLink,
  addFirstEpisodeLink,
  appActivate,
  appActivateButton,
  appActivateHighlights,
  appCard,
  appCardActiveBadge,
  appsPage,
  confirmDelete,
  confirmDeleteDialog,
  createFirstPodcastLink,
  editorialBoardCard,
  editorialBoardColumn,
  editorialBoardPage,
  editorialBoardTray,
  editorialBoardInactive,
  deactivatePodcastsMenuItem,
  deleteMenuItem,
  deletePodcastMenuItem,
  episodeForm,
  episodeFormSave,
  episodeFormTitle,
  episodeRow,
  episodesList,
  manageLink,
  manageMenuItem,
  newEpisodeLink,
  newPodcastLink,
  noEpisodesText,
  noPodcastsText,
  podcastActionsButton,
  podcastForm,
  podcastFormSave,
  podcastFormTitle,
  podcastManageLink,
  podcastRow,
  podcastTitle,
  podcastsAppActionsButton,
  podcastsInactive,
  podcastsList,
} from '@tryghost/test-data/selectors/apps';

/** Apps screen locators and gestures for acceptance specs; no assertions. */
export const appsScreen = {
  page: () => page.getByTestId(appsPage),
  card: (appId: string) => page.getByTestId(appCard(appId)),
  cardActiveBadge: (appId: string) => page.getByTestId(appCardActiveBadge(appId)),
  cardActions: (appName: string) =>
    page.getByRole('button', { name: `${appName} actions`, exact: true }),
  deactivateItem: (appName: string) =>
    page.getByRole('menuitem', { name: `Deactivate ${appName}`, exact: true }),
  activateLink: (appId: string) =>
    appsScreen.card(appId).getByRole('link', { name: activateLink, exact: true }),
  manageLink: (appId: string) =>
    appsScreen.card(appId).getByRole('link', { name: manageLink, exact: true }),

  activateFlow: () => page.getByTestId(appActivate),
  activateHighlights: () => page.getByTestId(appActivateHighlights),
  activateButton: () => page.getByTestId(appActivateButton),

  // Editorial board app
  editorialBoardInactive: () => page.getByTestId(editorialBoardInactive),
  editorialBoardPage: () => page.getByTestId(editorialBoardPage),
  editorialBoardColumns: () => page.getByTestId(editorialBoardColumn),
  editorialBoardCards: () => page.getByTestId(editorialBoardCard),
  editorialBoardTray: () => page.getByTestId(editorialBoardTray),

  // Podcasts app
  podcastsInactive: () => page.getByTestId(podcastsInactive),
  podcastsList: () => page.getByTestId(podcastsList),
  podcastRows: () => page.getByTestId(podcastRow),
  noPodcastsHeading: () => page.getByRole('heading', { name: noPodcastsText }),
  newPodcastLink: () => page.getByRole('link', { name: newPodcastLink, exact: true }),
  createFirstPodcastLink: () =>
    page.getByRole('link', { name: createFirstPodcastLink, exact: true }),
  podcastsAppActions: () => page.getByRole('button', { name: podcastsAppActionsButton }),
  deactivatePodcastsItem: () => page.getByRole('menuitem', { name: deactivatePodcastsMenuItem }),
  podcastRowActions: (title: string) =>
    page.getByRole('button', { name: `Actions for ${title}`, exact: true }),
  manageMenuItem: () => page.getByRole('menuitem', { name: manageMenuItem, exact: true }),
  deleteMenuItem: () => page.getByRole('menuitem', { name: deleteMenuItem, exact: true }),

  podcastForm: () => page.getByTestId(podcastForm),
  podcastFormTitle: () => page.getByTestId(podcastFormTitle),
  podcastFormSave: () => page.getByTestId(podcastFormSave),
  podcastTitleInput: () => appsScreen.podcastForm().getByLabelText('Title'),

  episodesList: () => page.getByTestId(episodesList),
  podcastTitle: () => page.getByTestId(podcastTitle),
  podcastManageLink: () => page.getByTestId(podcastManageLink),
  podcastActions: () => page.getByRole('button', { name: podcastActionsButton }),
  deletePodcastItem: () => page.getByRole('menuitem', { name: deletePodcastMenuItem }),
  episodeRows: () => page.getByTestId(episodeRow),
  noEpisodesHeading: () => page.getByRole('heading', { name: noEpisodesText }),
  newEpisodeLink: () => page.getByRole('link', { name: newEpisodeLink, exact: true }),
  addFirstEpisodeLink: () => page.getByRole('link', { name: addFirstEpisodeLink, exact: true }),

  episodeForm: () => page.getByTestId(episodeForm),
  episodeFormTitle: () => page.getByTestId(episodeFormTitle),
  episodeFormSave: () => page.getByTestId(episodeFormSave),
  episodeTitleInput: () => appsScreen.episodeForm().getByLabelText('Title'),
  episodeActions: () => page.getByRole('button', { name: 'Episode actions' }),
  deleteEpisodeItem: () => page.getByRole('menuitem', { name: 'Delete episode' }),

  createPostDialog: () => page.getByTestId('create-post-dialog'),
  createPostConfirm: () => page.getByTestId('create-post-confirm'),
  createPostDismiss: () => page.getByTestId('create-post-dismiss'),

  confirmDeleteDialog: () => page.getByTestId(confirmDeleteDialog),
  confirmDelete: () => page.getByTestId(confirmDelete),
};
