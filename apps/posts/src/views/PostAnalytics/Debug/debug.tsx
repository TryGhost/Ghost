import DebugTabs from './debug-tabs';
import React, {useState} from 'react';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, LoadingIndicator} from '@tryghost/shade/components';
import {Email, getEmail, getEmailAnalyticsStatus, getEmailBatches, getEmailRecipientFailures, useCancelScheduledEmailAnalytics, useScheduleEmailAnalytics} from '@tryghost/admin-x-framework/api/emails';
import {H1} from '@tryghost/shade/primitives';
import {Link, Navigate, hasBeenEmailed, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {getDefaultCustomScheduleRange, getEmailSettings, mapAnalyticsStatus, mapEmailBatches, mapRecipientFailures} from './debug-data';
import {isAuthorOrContributor, isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

// The post.email embed carries the full email resource (the framework type
// only declares the stats fields used elsewhere)
type DebugPost = Omit<Post, 'email'> & {
    email?: Email & {error?: string | null};
    email_only?: boolean;
};

const ANALYTICS_STATUS_POLL_INTERVAL = 5000;
const EMAIL_POLL_INTERVAL = 10000;

function formatPublishDate(publishedAt?: string): string {
    if (!publishedAt) {
        return '';
    }
    const date = new Date(publishedAt);
    if (isNaN(date.getTime())) {
        return '';
    }
    const datePart = date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
    const timePart = date.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
    return `on ${datePart} at ${timePart}`;
}

const Debug: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const handleError = useHandleError();

    const [customSchedule, setCustomSchedule] = useState({show: false, begin: '', end: ''});

    const {data: currentUser} = useCurrentUser();

    const {data: {posts: [postData]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: 'tags,authors,authors.roles,email,tiers,newsletter'
        },
        enabled: Boolean(postId)
    });
    const post = postData as DebugPost | undefined;

    const emailId = post?.email?.id ?? '';
    const hasEmail = Boolean(emailId);

    // Poll the email record so counts/status update while sending (Ember
    // polled every 10s)
    const {data: latestEmailData} = getEmail(emailId, {
        enabled: hasEmail,
        refetchInterval: EMAIL_POLL_INTERVAL,
        defaultErrorHandler: false
    });
    const email = latestEmailData?.emails?.[0] ?? post?.email;

    const {data: batchesData} = getEmailBatches(emailId, {enabled: hasEmail});
    const {data: failuresData} = getEmailRecipientFailures(emailId, {enabled: hasEmail});

    // Poll the analytics fetch status (Ember polled every 5s)
    const {data: analyticsStatusData} = getEmailAnalyticsStatus(emailId, {
        enabled: hasEmail,
        refetchInterval: ANALYTICS_STATUS_POLL_INTERVAL,
        defaultErrorHandler: false
    });

    const {mutateAsync: scheduleAnalytics} = useScheduleEmailAnalytics();
    const {mutateAsync: cancelScheduledAnalytics} = useCancelScheduledEmailAnalytics();

    if (isPostLoading || !currentUser) {
        return (
            <div className="flex h-full items-center justify-center py-20">
                <LoadingIndicator size="lg" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex h-full items-center justify-center py-20">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">404</h1>
                    <span aria-hidden="true">|</span>
                    <h2 className="text-lg">Post not found</h2>
                </div>
            </div>
        );
    }

    // Mirror the Ember route's permission guards: authors/contributors can
    // only see their own posts, and contributors only drafts
    const isAuthoredByUser = post.authors?.some(author => author.id === currentUser.id) ?? false;
    if (isAuthorOrContributor(currentUser) && !isAuthoredByUser) {
        return <Navigate to="/posts" replace />;
    }
    if (isContributorUser(currentUser) && post.status !== 'draft') {
        return <Navigate to="/posts" replace />;
    }

    const emailed = hasBeenEmailed(post as Post);
    const emailFailed = post.email?.status === 'failed';

    const batches = mapEmailBatches(batchesData?.batches);
    const permanentFailures = mapRecipientFailures(failuresData?.failures, 'permanent');
    const temporaryFailures = mapRecipientFailures(failuresData?.failures, 'temporary');
    const emailSettings = getEmailSettings(email);
    const analyticsStatus = mapAnalyticsStatus(analyticsStatusData);

    const failedBatches = batches.filter(batch => batch.statusClass === 'failed').length;
    const errorDetails = batches.length ? `${failedBatches} of ${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} failed to send, check below for more details.` : '';

    const handleToggleCustomSchedule = () => {
        setCustomSchedule((current) => {
            if (current.show) {
                return {show: false, begin: '', end: ''};
            }
            const defaults = getDefaultCustomScheduleRange(email?.created_at);
            return {show: true, ...defaults};
        });
    };

    const handleScheduleAnalytics = async () => {
        try {
            await scheduleAnalytics({
                id: emailId,
                begin: customSchedule.show && customSchedule.begin ? new Date(customSchedule.begin).toISOString() : undefined,
                end: customSchedule.show && customSchedule.end ? new Date(customSchedule.end).toISOString() : undefined
            });
            setCustomSchedule({show: false, begin: '', end: ''});
        } catch (e) {
            handleError(e);
        }
    };

    const handleCancelScheduledAnalytics = async () => {
        try {
            await cancelScheduledAnalytics();
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1200px] px-8 py-8" data-testid="post-debug">
            <header className="mb-8">
                <Breadcrumb className="mb-2">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink className="cursor-pointer" onClick={() => navigate('/posts')}>Posts</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink className="cursor-pointer" onClick={() => navigate(`/posts/analytics/${post.id}`)}>Analytics</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Debug</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <H1 data-testid="post-debug-title">{post.title}</H1>
                <div className="mt-2 text-sm text-gray-700" data-testid="post-debug-status">
                    {emailed
                        ? (post.email_only ? 'Sent' : 'Published and sent')
                        : (emailFailed ? 'Published but failed to send' : 'Published on your site')}
                    {' '}
                    {formatPublishDate(post.published_at)}
                </div>
                {emailFailed && (
                    <div className="mt-4 flex items-center justify-between gap-4 rounded border border-red-300 bg-red-50 p-4" data-testid="post-debug-error">
                        <div>
                            <h4 className="font-semibold text-red-700">{post.email?.error || 'Failed to send email.'}</h4>
                            {errorDetails && <p className="mt-1 text-sm text-red-700">{errorDetails}</p>}
                        </div>
                        <Link className="shrink-0 rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white" to={`/editor/post/${post.id}`}>
                            Retry
                        </Link>
                    </div>
                )}
            </header>

            <DebugTabs
                analyticsStatus={analyticsStatus}
                batches={batches}
                customSchedule={customSchedule}
                emailSettings={emailSettings}
                permanentFailures={permanentFailures}
                temporaryFailures={temporaryFailures}
                onCancelScheduledAnalytics={handleCancelScheduledAnalytics}
                onCustomScheduleChange={changes => setCustomSchedule(current => ({...current, ...changes}))}
                onScheduleAnalytics={handleScheduleAnalytics}
                onToggleCustomSchedule={handleToggleCustomSchedule}
            />
        </div>
    );
};

export default Debug;
