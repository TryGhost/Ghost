import { NavMenuItem } from './nav-menu-item';
import { getColorHex } from './shared-views';

export interface NavSavedView {
  key: string;
  name: string;
  to: string;
  isActive: boolean;
  color?: string;
}

interface NavSavedViewsProps {
  views: NavSavedView[];
}

export function NavSavedViews({ views }: NavSavedViewsProps) {
  if (views.length === 0) {
    return null;
  }

  return (
    <>
      {views.map((view) => (
        <NavMenuItem.SubmenuItem
          key={view.key}
          isActive={view.isActive}
          title={view.name}
          to={view.to}
        >
          <NavMenuItem.Label className={view.color ? 'grow' : undefined}>
            {view.name}
          </NavMenuItem.Label>
          {view.color && (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              data-color={view.color}
              style={{ backgroundColor: getColorHex(view.color) }}
            />
          )}
        </NavMenuItem.SubmenuItem>
      ))}
    </>
  );
}
