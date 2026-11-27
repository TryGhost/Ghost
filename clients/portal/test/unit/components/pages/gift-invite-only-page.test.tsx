import { fireEvent, render } from '../../../utils/test-utils';
import GiftInviteOnlyPage from '../../../../src/components/pages/gift-invite-only-page';
import { getSiteData } from '../../../../src/utils/fixtures-generator';

describe('GiftInviteOnlyPage', () => {
  test('explains that gifts are unavailable on invite-only sites', () => {
    const site = getSiteData({ membersSignupAccess: 'invite' });
    const { getByRole, getByText } = render(<GiftInviteOnlyPage />, {
      overrideContext: { site },
    });

    expect(getByRole('heading', { name: site.title })).toBeInTheDocument();
    expect(
      getByText('This site is invite-only, contact the owner for access.'),
    ).toBeInTheDocument();
  });

  test('closes the popup', () => {
    const site = getSiteData({ membersSignupAccess: 'invite' });
    const { getByRole, mockDoActionFn } = render(<GiftInviteOnlyPage />, {
      overrideContext: { site },
    });

    fireEvent.click(getByRole('button', { name: 'Close popup' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });
});
