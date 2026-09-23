/**
 * Apps screen selector strings, consumed by the admin screen helpers and the
 * e2e page objects. Source of truth: apps/admin/src/apps.
 */

// testids
export const appsPage = 'apps-page';
export const appCard = (appId: string) => `app-card-${appId}`;
export const appCardActiveBadge = (appId: string) => `app-card-${appId}-active`;
export const appActivate = 'app-activate';
export const appActivateHighlights = 'app-activate-highlights';
export const appActivateButton = 'app-activate-button';

// Podcasts app testids
export const podcastsInactive = 'podcasts-inactive';
export const podcastsList = 'podcasts-list';
export const podcastsTable = 'podcasts-table';
export const podcastRow = 'podcast-row';
export const podcastEpisodeCount = 'podcast-episode-count';
export const podcastForm = 'podcast-form';
export const podcastFormTitle = 'podcast-form-title';
export const podcastFormSave = 'podcast-form-save';
export const podcastManageLink = 'podcast-manage-link';
export const episodesList = 'episodes-list';
export const podcastTitle = 'podcast-title';
export const episodesTable = 'episodes-table';
export const episodeRow = 'episode-row';
export const episodeForm = 'episode-form';
export const episodeFormTitle = 'episode-form-title';
export const episodeFormSave = 'episode-form-save';
export const confirmDeleteDialog = 'confirm-delete-dialog';
export const confirmDelete = 'confirm-delete';

// Editorial board app testids
export const editorialBoardInactive = 'editorial-board-inactive';
export const editorialBoardPage = 'editorial-board-page';
export const editorialBoardColumns = 'editorial-board-columns';
export const editorialBoardColumn = 'editorial-board-column';
export const editorialBoardCard = 'editorial-board-card';
export const editorialBoardTray = 'editorial-board-tray';

// accessible names
export const appsNavLink = 'Apps';
export const activateLink = 'Activate';
export const editorialBoardNavLink = 'Editorial board';
export const manageLink = 'Manage';
export const newPodcastLink = 'New podcast';
export const createFirstPodcastLink = 'Create your first podcast';
export const newEpisodeLink = 'New episode';
export const addFirstEpisodeLink = 'Add the first episode';
export const podcastsAppActionsButton = 'Podcasts app actions';
export const podcastActionsButton = 'Podcast actions';
export const deactivatePodcastsMenuItem = 'Deactivate Podcasts';
export const deletePodcastMenuItem = 'Delete podcast';
export const deleteMenuItem = 'Delete';
export const manageMenuItem = 'Manage';
export const podcastTitleLabel = 'Title';
export const episodeStatusLabel = 'Status';

// text fragments
export const noPodcastsText = 'No podcasts yet';
export const noEpisodesText = 'No episodes yet';
export const podcastsInactiveText = 'Podcasts is not active';
