// admin7Design: inactive nav icons and the group eyebrows sit well below the
// labels, as in Admin7Vision; hover (and an eyebrow link's own page) restores
// the full colour. Shared by the main sidebar and the Settings menu.
export const ADMIN7_NAV_ICON_CLASS_NAME = [
  '[&_[data-sidebar=menu-button][data-active=false]:not(:hover)>svg]:text-gray-700',
  'dark:[&_[data-sidebar=menu-button][data-active=false]:not(:hover)>svg]:text-gray-600',
  '[&_[data-sidebar=group-label]:not(:hover):not([aria-current=page])]:text-gray-700',
  'dark:[&_[data-sidebar=group-label]:not(:hover):not([aria-current=page])]:text-sidebar-foreground/70',
].join(' ');
