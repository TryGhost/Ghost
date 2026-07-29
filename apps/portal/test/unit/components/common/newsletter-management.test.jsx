import {render, fireEvent, act} from '../../../utils/test-utils';
import NewsletterManagement from '../../../../src/components/common/newsletter-management';
import {getSiteData, getMemberData, getNewslettersData} from '../../../../src/utils/fixtures-generator';

const noop = () => {};

const renderManagement = (overrides = {}) => {
    const props = {
        hasNewslettersEnabled: true,
        subscribedNewsletters: [],
        updateSubscribedNewsletters: noop,
        updateCommentNotifications: vi.fn().mockResolvedValue(undefined),
        updateUpdatesAndAnnouncements: vi.fn().mockResolvedValue(undefined),
        unsubscribeAll: noop,
        isPaidMember: false,
        isCommentsEnabled: true,
        enableCommentNotifications: false,
        canChangeUpdatesAndAnnouncements: true,
        enableUpdatesAndAnnouncements: false,
        ...overrides
    };
    return render(
        <NewsletterManagement {...props} />,
        {
            overrideContext: {
                site: getSiteData(),
                member: getMemberData()
            }
        }
    );
};

describe('NewsletterManagement', () => {
    test('wires accessible names from the visible titles to each preference toggle', () => {
        const newsletters = getNewslettersData({numOfNewsletters: 1}).map(n => ({
            ...n,
            id: 'n1',
            name: 'Weekly Digest'
        }));
        const site = getSiteData({
            newsletters,
            labs: {automations: true}
        });

        const {getByRole, getByTestId} = render(
            <NewsletterManagement
                hasNewslettersEnabled={true}
                subscribedNewsletters={[]}
                updateSubscribedNewsletters={noop}
                updateCommentNotifications={vi.fn().mockResolvedValue(undefined)}
                updateUpdatesAndAnnouncements={vi.fn().mockResolvedValue(undefined)}
                unsubscribeAll={noop}
                isPaidMember={false}
                isCommentsEnabled={true}
                enableCommentNotifications={false}
                canChangeUpdatesAndAnnouncements={true}
                enableUpdatesAndAnnouncements={false}
            />,
            {
                overrideContext: {
                    site,
                    member: getMemberData()
                }
            }
        );

        const commentToggle = getByRole('button', {name: 'Comments'});
        expect(commentToggle).toHaveAttribute('aria-labelledby', 'portal-toggle-label-comments');
        expect(commentToggle.querySelector('#portal-toggle-label-comments')).toHaveTextContent('Comments');

        const updatesToggle = getByRole('button', {name: 'Updates & announcements'});
        expect(updatesToggle).toHaveAttribute('aria-labelledby', 'portal-toggle-label-updates-and-announcements');

        const newsletterToggle = getByTestId('newsletter-toggle');
        expect(newsletterToggle).toHaveAttribute('aria-labelledby', 'portal-toggle-label-n1');
        expect(newsletterToggle.querySelector('#portal-toggle-label-n1')).toHaveTextContent('Weekly Digest');
    });

    describe('CommentsSection isUpdating guard', () => {
        test('coalesces rapid double-clicks on the inner Switch into a single update', async () => {
            // Slow update: stays pending so the second click hits the guard.
            let resolveUpdate;
            const updateCommentNotifications = vi.fn(() => new Promise((resolve) => {
                resolveUpdate = resolve;
            }));

            const {getAllByTestId} = renderManagement({updateCommentNotifications});

            // First switch is the comments toggle (no newsletters in this setup).
            const switches = getAllByTestId('switch-input');
            const commentsSwitch = switches[0];

            // Two rapid clicks while the first update is still in flight.
            fireEvent.click(commentsSwitch);
            fireEvent.click(commentsSwitch);

            // Only one call dispatched — the second is dropped by the isUpdating guard.
            expect(updateCommentNotifications).toHaveBeenCalledTimes(1);

            // Drain the pending promise to satisfy React's act() expectations.
            await act(async () => {
                resolveUpdate();
            });
        });

        test('coalesces rapid double-clicks on the row into a single update', async () => {
            let resolveUpdate;
            const updateCommentNotifications = vi.fn(() => new Promise((resolve) => {
                resolveUpdate = resolve;
            }));

            const {getByTestId} = renderManagement({updateCommentNotifications});

            const commentsRow = getByTestId('comment-toggle');

            fireEvent.click(commentsRow);
            fireEvent.click(commentsRow);

            expect(updateCommentNotifications).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveUpdate();
            });
        });
    });

    describe('UpdatesAndAnnouncementsSection isUpdating guard', () => {
        test('coalesces rapid double-clicks on the inner Switch into a single update', async () => {
            let resolveUpdate;
            const updateUpdatesAndAnnouncements = vi.fn(() => new Promise((resolve) => {
                resolveUpdate = resolve;
            }));

            const {getByTestId} = renderManagement({updateUpdatesAndAnnouncements});

            // Find the updates & announcements switch via its row's testid.
            const updatesRow = getByTestId('updates-and-announcements-toggle');
            const updatesSwitch = updatesRow.querySelector('[data-testid="switch-input"]');

            fireEvent.click(updatesSwitch);
            fireEvent.click(updatesSwitch);

            expect(updateUpdatesAndAnnouncements).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveUpdate();
            });
        });
    });
});
