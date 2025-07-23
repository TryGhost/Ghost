import Layout from '@components/layout/Layout';
import {Button, H4, LucideIcon} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useRouteError} from 'react-router';

const Error = ({statusCode}: {statusCode?: number}) => {
    const routeError = useRouteError();
    const navigate = useNavigate();

    const toDashboard = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        navigate('/dashboard', {crossApp: true});
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

    return (
        <div className="admin-x-container-error">
            <div className="admin-x-error max-w-xl">
                <h1>Loading interrupted</h1>
                <p>They say life is a series of trials and tribulations. This moment right here? It&apos;s a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                <a className='cursor-pointer text-green' onClick={toDashboard}>&larr; Back to the dashboard</a>
            </div>
        </div>
    );
};

export default Error;
