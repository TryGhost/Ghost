/*
 * Admin's pages, as the Help panel knows them: each page's key, its label,
 * the routes it covers, the help center topics it's about, and the articles it
 * suggests while the help center hasn't tagged any for it.
 *
 * The keys are a contract with the help center: the docs team attaches an
 * article to a page by tagging it #admin-<key> (help-contract.ts lists every
 * key and slug the panel relies on). Never rename a key: every article tagged
 * with it would silently stop showing. Adding keys is safe.
 */

/** A page's key, and its #admin-<key> tag in the help center. */
export type HelpPageKey =
  | 'home'
  | 'analytics'
  | 'posts'
  | 'pages'
  | 'editor'
  | 'tags'
  | 'members'
  | 'comments'
  | 'automations'
  | 'network'
  | 'newsletters'
  | 'design'
  | 'membership'
  | 'settings'
  | 'ghost-pro';

/**
 * The key for suggestions without a page (the user took the page out of the
 * question): #admin-general. Until the help center tags articles with it, the
 * help center's featured articles stand in; those are chosen for its own
 * homepage (getting started), not the questions support gets most.
 */
export const GENERAL_KEY = 'general';

/** How each page is named in the panel (the chip beside the composer). */
export const PAGE_LABELS: Record<HelpPageKey, string> = {
  home: 'Dashboard',
  analytics: 'Analytics',
  posts: 'Posts',
  pages: 'Pages',
  editor: 'Editor',
  tags: 'Tags',
  members: 'Members',
  comments: 'Comments',
  automations: 'Automations',
  network: 'Network',
  newsletters: 'Newsletters',
  design: 'Design',
  membership: 'Membership',
  settings: 'Settings',
  'ghost-pro': 'Ghost(Pro)',
};

// Settings screens with a page of their own, by their route under /settings
// (settings/routes.tsx). Every other settings route is 'settings'.
const SETTINGS_PAGES: Record<string, HelpPageKey> = {
  newsletters: 'newsletters',
  design: 'design',
  theme: 'design',
  navigation: 'design',
  'announcement-bar': 'design',
  portal: 'membership',
  tiers: 'membership',
  offers: 'membership',
  'stripe-connect': 'membership',
  recommendations: 'membership',
  'embed-signup-form': 'membership',
};

/** The page key for an Admin route. */
export function getPageKey(pathname: string): HelpPageKey {
  const [first = '', second = ''] = pathname.split('/').filter(Boolean);

  switch (first) {
    case 'analytics':
    case 'posts':
    case 'pages':
    case 'editor':
    case 'tags':
    case 'members':
    case 'comments':
    case 'automations':
      return first;
    case 'members-activity':
      return 'members';
    case 'activitypub':
    case 'network':
      return 'network';
    case 'settings':
      return SETTINGS_PAGES[second] ?? 'settings';
    // Billing, domains, backups and support for Ghost(Pro) sites
    case 'pro':
      return 'ghost-pro';
    default:
      return 'home';
  }
}

/**
 * The help center topics (tag slugs) each page is about. Suggestions fill
 * with articles whose primary topic is one of these, and search lifts them
 * for questions asked from the page.
 */
export const PAGE_TOPICS: Record<HelpPageKey, string[]> = {
  home: ['getting-started'],
  analytics: ['growth-analytics'],
  posts: ['publishing'],
  pages: ['publishing'],
  editor: ['publishing'],
  tags: ['publishing'],
  members: ['memberships'],
  comments: ['memberships'],
  automations: ['labs'],
  network: ['labs'],
  newsletters: ['newsletters'],
  design: ['design'],
  membership: ['memberships', 'payments'],
  settings: ['ghost-pro', 'advanced'],
  'ghost-pro': ['ghost-pro'],
};

/**
 * The articles (slugs) each page suggests while none are tagged #admin-<page>
 * in the help center. Only a fallback, so the panel is useful before any
 * tagging: without them a page would only have its topic's, which Posts and
 * Pages share, and which for Comments (Memberships) is mostly about other
 * things. Tagged articles replace them outright.
 */
export const PAGE_ARTICLES: Record<HelpPageKey, string[]> = {
  home: ['site-setup'],
  analytics: ['native-analytics', 'post-analytics'],
  posts: ['posts', 'publishing-content'],
  pages: ['pages', 'build-a-custom-homepage'],
  editor: ['using-the-editor', 'cards'],
  tags: ['tags', 'organizing-content'],
  members: ['member-management', 'import-members'],
  comments: ['commenting'],
  automations: ['automations-beta', 'welcome-emails'],
  network: ['social-web'],
  newsletters: ['setup-email-newsletters', 'email-delivery-tips'],
  design: ['design-settings', 'installing-a-theme'],
  membership: ['setup-members', 'stripe'],
  settings: ['site-setup'],
  // Billing, domain, payment problems and cancelling: what brings people here
  'ghost-pro': [
    'manage-your-subscription',
    'using-custom-domains',
    'troubleshooting-payment-issues',
    'turn-off-auto-renew',
  ],
};
