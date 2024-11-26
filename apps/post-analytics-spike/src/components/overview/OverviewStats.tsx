// The main Web stats component that encapsulates the breakdown

const OverviewStats = () => {
    return (
        <div className="flex w-full flex-col py-10 text-grey-600">
            <h4 className="mb-3">Overview</h4>
            <p>[Funnel: Sent &rarr; Opened &rarr; Clicked]</p>
            <p>[Misc email: Unsubscribed | Spam | Bounced]</p>
            <p>[Top links] [Feedback]</p>
        </div>
    );
};

export default OverviewStats;