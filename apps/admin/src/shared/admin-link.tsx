import {Link} from '@tryghost/admin-x-framework';
import {forwardRef} from 'react';
import {useIsEmberOwnedRoute} from '@/routes';

type AdminLinkProps = Omit<React.ComponentProps<'a'>, 'href'> & {
    /** In-app path, e.g. `/tags/news` or `/members?filter=…` */
    to: string;
};

// Ember only follows hashchange, which the router's pushState navigation does not
// fire, so links into Ember-owned routes stay native hash anchors. Everything else
// goes through the router so the entry carries router state for the history blockers.
export const AdminLink = forwardRef<HTMLAnchorElement, AdminLinkProps>(function AdminLink({to, children, ...props}, ref) {
    const isEmberOwned = useIsEmberOwnedRoute(to.split('?')[0]);
    return isEmberOwned
        ? <a ref={ref} href={`#${to}`} {...props}>{children}</a>
        : <Link ref={ref} to={to} {...props}>{children}</Link>;
});
