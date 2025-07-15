import React from 'react';

interface StatsErrorPageProps {
    error?: Error;
}

const StatsErrorPage: React.FC<StatsErrorPageProps> = ({error}) => {
    return (
        <div className="admin-x-container-error">
            <div className="admin-x-error">
                <h1>Loading interrupted</h1>
                <p>They say life is a series of trials and tribulations. This moment right here? It's a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                <a className="cursor-pointer" onClick={() => window.location.reload()}>&larr; Back to the dashboard</a>
                <pre className="hidden">{error?.message}</pre>
            </div>
        </div>
    );
};

export default StatsErrorPage;