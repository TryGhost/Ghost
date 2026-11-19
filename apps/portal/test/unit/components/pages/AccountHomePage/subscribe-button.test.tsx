import { render } from '../../../../utils/test-utils';
import SubscribeButton from '../../../../../src/components/pages/AccountHomePage/components/subscribe-button';
import { getSiteData } from '../../../../../src/utils/fixtures-generator';

describe('SubscribeButton', () => {
  test('shows View plans on an invite-only site with paid prices', () => {
    const site = getSiteData({ membersSignupAccess: 'invite' });
    const { queryByRole } = render(<SubscribeButton />, { overrideContext: { site } });

    expect(queryByRole('button', { name: 'View plans' })).toBeInTheDocument();
  });

  test('renders nothing when the site has no paid prices', () => {
    const site = getSiteData({ membersSignupAccess: 'all', portalPlans: ['free'] });
    const { container } = render(<SubscribeButton />, { overrideContext: { site } });

    expect(container).toBeEmptyDOMElement();
  });
});
