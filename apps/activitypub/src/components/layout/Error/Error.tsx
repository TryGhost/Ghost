import Layout from '@components/layout/Layout';
import {Button, H4, LucideIcon} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useRouteError} from 'react-router';

const Error = ({statusCode, errorCode}: {statusCode?: number, errorCode?: string}) => {
    const routeError = useRouteError();
    const navigate = useNavigate();

    const toAnalytics = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        navigate('/analytics/', {crossApp: true});
    };

    if (routeError) {
        return (
            <Layout>
                <EmptyViewIndicator>
                    <EmptyViewIcon><LucideIcon.SearchX /></EmptyViewIcon>
                    <H4 className='-mb-4'>Oops, page not found!</H4>
                    <div>We couldn&apos;t find the page you were looking for. It may have been moved, deleted, or never existed in the first place.</div>
                </EmptyViewIndicator>
            </Layout>
        );
    }

    if (statusCode === 429) {
        return (
            <EmptyViewIndicator className='mt-[50vh] -translate-y-1/2'>
                <EmptyViewIcon><LucideIcon.TriangleAlert /></EmptyViewIcon>
                <H4 className='-mb-4'>Rate limit exceeded</H4>
                <div>You&apos;ve made too many requests. Please try again in a moment.</div>
                <Button asChild>
                    <a href="https://ghost.org/help/social-web/" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                </Button>
            </EmptyViewIndicator>
        );
    }

    if (statusCode === 403) {
        // API-related 403 errors (ROLE_MISSING, SITE_MISSING) indicate misconfiguration
        if (errorCode === 'ROLE_MISSING' || errorCode === 'SITE_MISSING') {
            return (
                <EmptyViewIndicator className='mt-[50vh] -translate-y-1/2'>
                    <EmptyViewIcon><LucideIcon.Settings /></EmptyViewIcon>
                    <H4 className='-mb-4'>Site not configured correctly</H4>
                    <div>This feature can&apos;t be used because the site isn&apos;t set up correctly. If you manage this site, check your settings or server logs, or contact support.</div>
                    <Button asChild>
                        <a href="https://ghost.org/help/social-web/" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                    </Button>
                </EmptyViewIndicator>
            );
        }

        // Infrastructure-level 403 errors (account suspended)
        return (
            <EmptyViewIndicator className='mt-[50vh] -translate-y-1/2'>
                <EmptyViewIcon><LucideIcon.Ban /></EmptyViewIcon>
                <H4 className='-mb-4'>Account suspended</H4>
                <div>Your account has been suspended due to policy violations.</div>
                <Button asChild>
                    <a href="https://ghost.org/help/social-web/" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                </Button>
            </EmptyViewIndicator>
        );
    }

    if (statusCode === 410 && errorCode === 'INVALID_VERSION') {
        return (
            <EmptyViewIndicator className='mt-[50vh] -translate-y-1/2'>
                <EmptyViewIcon><LucideIcon.DownloadCloud /></EmptyViewIcon>
                <H4 className='-mb-4'>New version available</H4>
                <div>We&apos;ve made some updates! Refresh your page to see what&apos;s new</div>
                <Button asChild>
                    <button type='button' onClick={() => window.location.reload()}>Refresh your page</button>
                </Button>
            </EmptyViewIndicator>
        );
    }

    return (
        <div className="admin-x-container-error">
            <div className="admin-x-error max-w-xl">
                <h1>Loading interrupted</h1>
                <p>They say life is a series of trials and tribulations. This moment right here? It&apos;s a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                <a className='cursor-pointer text-green' onClick={toAnalytics}>&larr; Back to the homepage</a>
            </div>
        </div>
    );
};

export default Error;
