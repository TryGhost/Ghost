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
                <NavMenuItem key={view.key}>
                    <NavMenuItem.Link
                        className="pl-9"
                        to={view.to}
                        isActive={view.isActive}
                    >
                        <NavMenuItem.Label className={view.color ? 'grow' : undefined}>{view.name}</NavMenuItem.Label>
                        {view.color && (
                            <span
                                className="mx-0.5 size-2 shrink-0 rounded-full"
                                style={{backgroundColor: getColorHex(view.color)}}
                                data-color={view.color}
                                aria-hidden="true"
                            />
                        )}
                    </NavMenuItem.Link>
                </NavMenuItem>
            ))}
        </>
    );
}
