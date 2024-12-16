import {render, fireEvent} from '../../../utils/test-utils';
import AccountHomePage from './AccountHomePage';
import {site} from '../../../utils/fixtures';
import {getSiteData, getNewslettersData} from '../../../utils/fixtures-generator';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const logoutBtn = utils.queryByRole('button', {name: 'logout'});
    return {
        logoutBtn,
        mockOnActionFn,
        utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const siteData = getSiteData({commentsEnabled: 'off'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockOnActionFn, logoutBtn} = setup();

        fireEvent.click(logoutBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('signout');
    });

    test('can show Manage button for few newsletters', () => {
        const {mockOnActionFn, utils} = setup({site: site});

        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();

        const manageBtn = utils.queryByRole('button', {name: 'Manage'});
        expect(manageBtn).toBeInTheDocument();

        fireEvent.click(manageBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {lastPage: 'accountHome', page: 'accountEmail'});
    });

    test('hides Newsletter toggle if newsletters are disabled', () => {
        const siteData = getSiteData({editorDefaultEmailRecipients: 'disabled'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).not.toBeInTheDocument();
    });

    test('newsletter settings is not visible when newsletters are disabled and comments are disabled', async () => {
        const siteData = getSiteData({
            editorDefaultEmailRecipients: 'disabled',
            commentsEnabled: 'off'
        });

        const {utils} = setup({site: siteData});

        expect(utils.queryByText('Email preferences')).not.toBeInTheDocument();
    });

    test('Email preferences / settings is visible when newsletters are disabled and comments are enabled', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            editorDefaultEmailRecipients: 'disabled',
            commentsEnabled: 'all'
        });

        const {utils} = setup({site: siteData});

        expect(utils.queryByText('Emails')).toBeInTheDocument();
        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
        expect(utils.queryByText('Newsletters')).not.toBeInTheDocument(); // there should be no sign of newsletters
    });
});
