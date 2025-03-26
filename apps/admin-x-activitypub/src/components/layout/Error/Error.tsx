import Layout from '@components/layout/Layout';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {H3, LucideIcon} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useRouteError} from 'react-router';

const Error = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    const toDashboard = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        navigate('/dashboard', {crossApp: true});
    };

    return (
        !error ? (
            <Layout>
                <EmptyViewIndicator>
                    <EmptyViewIcon><LucideIcon.SearchX /></EmptyViewIcon>
                    <H3 className='-mb-3'>Oops, page not found!</H3>
                    <div>We couldn&apos;t find the page you were looking for. It may have been moved, deleted, or never existed in the first place.</div>
                </EmptyViewIndicator>
            </Layout>
        ) : (
            <div className="admin-x-container-error">
                <div className="admin-x-error max-w-xl">
                    <h1>Loading interrupted</h1>
                    <p>They say life is a series of trials and tribulations. This moment right here? It&apos;s a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                    <a className='cursor-pointer text-green' onClick={toDashboard}>&larr; Back to the dashboard</a>
                </div>
            </div>
        )
    );
};

export default Error;
