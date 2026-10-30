import { render, fireEvent, waitFor } from '../../../utils/test-utils';
import UnsubscribePage from '../../../../src/components/pages/unsubscribe-page';
import { getSiteData, getMemberData } from '../../../../src/utils/fixtures-generator';

const toggles = [
  [
    'comment-toggle',
    { comments: true },
    'enableCommentNotifications',
    'enable_comment_notifications',
    'Comment preferences updated.',
  ],
  [
    'updates-and-announcements-toggle',
    { updatesAndAnnouncements: true },
    'enableUpdatesAndAnnouncements',
    'enable_updates_and_announcements',
    'Email preferences updated.',
  ],
];

const member = {
  ...getMemberData(),
  enable_comment_notifications: true,
  enable_updates_and_announcements: true,
};

const setup = ({ signedIn = false, linkParams, doAction, updateNewsletters }) => {
  return render(<UnsubscribePage />, {
    overrideContext: {
      site: getSiteData({ labs: { automations: true } }),
      member: signedIn ? member : null,
      pageData: { uuid: member.uuid, key: 'key', ...linkParams },
      api: { member: { newsletters: vi.fn().mockResolvedValue(member), updateNewsletters } },
      ...(doAction ? { doAction } : {}),
    },
  });
};

describe('Unsubscribe Page', () => {
  test.each(toggles)(
    '%s shows a retryable error when the signed-out save fails',
    async (toggleTestId, linkParams, updateKey, field, successMessage) => {
      const updateNewsletters = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementationOnce(async (data) => ({ ...member, [field]: data[updateKey] }));
      const { mockDoActionFn, findByTestId, queryByText, getByText } = setup({
        linkParams,
        updateNewsletters,
      });
      const toggle = await findByTestId(toggleTestId);

      await waitFor(() => {
        expect(mockDoActionFn).toHaveBeenCalledWith('showPopupNotification', {
          action: 'updateNewsletter:failed',
          status: 'error',
          message: 'Failed to update newsletter settings',
        });
      });
      expect(mockDoActionFn).not.toHaveBeenCalledWith(
        'showPopupNotification',
        expect.objectContaining({ action: 'updated:success' }),
      );
      expect(queryByText(/email address was not found/)).not.toBeInTheDocument();
      expect(getByText(/will no longer receive/)).toHaveClass('gh-portal-hide');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(toggle);

      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));
      expect(updateNewsletters).toHaveBeenLastCalledWith(
        expect.objectContaining({ [updateKey]: false }),
      );
      expect(mockDoActionFn).toHaveBeenCalledWith('showPopupNotification', {
        action: 'updated:success',
        message: successMessage,
      });
    },
  );

  test.each(toggles)(
    '%s leaves signed-in feedback to the saved result',
    async (toggleTestId, linkParams, updateKey, field, successMessage) => {
      let saveSucceeds = false;
      const doAction = vi.fn(async (action, data) => {
        if (action !== 'updateNewsletterPreference') {
          return undefined;
        }
        return saveSucceeds
          ? {
              action: 'updateNewsletterPref:success',
              member: { ...member, [field]: data[updateKey] },
            }
          : { action: 'updateNewsletterPref:failed' };
      });
      const { findByTestId } = setup({ signedIn: true, linkParams, doAction });
      const toggle = await findByTestId(toggleTestId);

      await waitFor(() => {
        expect(doAction).toHaveBeenCalledWith('updateNewsletterPreference', {
          [updateKey]: false,
          successMessage,
        });
      });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      saveSucceeds = true;
      fireEvent.click(toggle);

      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));
      expect(doAction).not.toHaveBeenCalledWith('showPopupNotification', expect.anything());
    },
  );
});
