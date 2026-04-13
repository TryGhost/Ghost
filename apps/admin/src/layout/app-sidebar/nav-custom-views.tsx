import { NavSavedViews } from './nav-saved-views';
import { useCustomSidebarViews } from './use-custom-sidebar-views';

interface NavCustomViewsProps {
    route?: 'posts' | 'pages';
}

export function NavCustomViews({ route = 'posts' }: NavCustomViewsProps) {
    const customViews = useCustomSidebarViews(route);

    return <NavSavedViews views={customViews} />;
}
