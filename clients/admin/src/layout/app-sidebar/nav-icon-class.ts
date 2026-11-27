// admin7Design: a slightly softer semantic icon tone shared by the main and
// Settings navigation. Hover/active icons and group-label colours stay unchanged.
export const ADMIN7_NAV_ICON_CLASS_NAME = [
  '[&_[data-sidebar=menu-button][data-active=false]:not(:hover)>:is(svg,[data-slot=nav-icon])]:text-muted-foreground/90',
  '[&_[data-sidebar=group-label]:not(:hover):not([aria-current=page])]:text-gray-700',
  'dark:[&_[data-sidebar=group-label]:not(:hover):not([aria-current=page])]:text-sidebar-foreground/70',
].join(' ');
