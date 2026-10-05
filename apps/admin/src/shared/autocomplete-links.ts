export interface AutocompleteLink {
  label: string;
  value: string;
}

export interface AutocompleteLinkSettings {
  /** Adds a share link for the post or page being edited */
  postType?: 'post' | 'page';
  homepageUrl: string;
  paidMembersEnabled: boolean;
  donationsEnabled: boolean;
  recommendationsEnabled: boolean;
}

export interface OfferLinkSource {
  name: string;
  code: string;
}

export function buildOfferLinks(
  offers: OfferLinkSource[],
  homepageUrl: string,
): AutocompleteLink[] {
  return offers.map((offer) => ({
    label: `Offer — ${offer.name}`,
    value: `${homepageUrl}${offer.code.replace(/^\//, '')}`,
  }));
}

export function buildAutocompleteLinks(
  settings: AutocompleteLinkSettings,
  offerLinks: AutocompleteLink[],
): AutocompleteLink[] {
  const defaults = [
    { label: 'Homepage', value: settings.homepageUrl },
    { label: 'Free signup', value: '#/portal/signup/free' },
  ];

  const shareLink = settings.postType
    ? [{ label: `Share ${settings.postType}`, value: '#/share' }]
    : [];

  const memberLinks = settings.paidMembersEnabled
    ? [
        { label: 'Paid signup', value: '#/portal/signup' },
        { label: 'Upgrade or change plan', value: '#/portal/account/plans' },
      ]
    : [];

  const donationLink = settings.donationsEnabled
    ? [{ label: 'Tips and donations', value: '#/portal/support' }]
    : [];

  const recommendationLink = settings.recommendationsEnabled
    ? [{ label: 'Recommendations', value: '#/portal/recommendations' }]
    : [];

  const giftLink = settings.paidMembersEnabled
    ? [{ label: 'Gift subscriptions', value: '#/portal/gift' }]
    : [];

  return [
    ...defaults,
    ...memberLinks,
    ...donationLink,
    ...giftLink,
    ...shareLink,
    ...recommendationLink,
    ...offerLinks,
  ];
}
