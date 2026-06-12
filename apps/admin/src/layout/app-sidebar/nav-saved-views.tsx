import {NavMenuItem} from './nav-menu-item';
import {getColorHex} from './shared-views';

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

export function NavSavedViews({views}: NavSavedViewsProps) {
    if (views.length === 0) {
        return null;
    }

    return (
        <>
            {views.map((view) => (
                <NavMenuItem.SubmenuItem
                    key={view.key}
                    to={view.to}
                    isActive={view.isActive}
                    title={view.name}
                >
                    <NavMenuItem.Label className={view.color ? 'grow' : undefined}>{view.name}</NavMenuItem.Label>
                    {view.color && (
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{backgroundColor: getColorHex(view.color)}}
                            data-color={view.color}
                            aria-hidden="true"
                        />
                    )}
                </NavMenuItem.SubmenuItem>
            ))}
        </>
    );
}
