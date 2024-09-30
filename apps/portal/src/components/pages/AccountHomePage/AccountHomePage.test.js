import {render, fireEvent} from '../../../utils/test-utils';
import AccountHomePage from './AccountHomePage';
import {site} from '../../../utils/fixtures';
import {getSiteData} from '../../../utils/fixtures-generator';

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
    test('renders default with 1 newsletter', () => {
        const siteData = getSiteData({commentsEnabled: 'off', editorDefaultEmailRecipients: 'visibility', newsletters: [site.newsletters[0]]});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
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

    test('hides Newsletter toggle if newsletters and comments are disabled', () => {
        const siteData = getSiteData({editorDefaultEmailRecipients: 'disabled', newsletters: [], commentsEnabled: 'off'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).not.toBeInTheDocument();
        expect(utils.queryByText('Update your preferences')).not.toBeInTheDocument();
    });

    test('shows Email preferences option if comments are enabled but no newsletters', () => {
        const siteData = getSiteData({editorDefaultEmailRecipients: 'disabled', newsletters: [], commentsEnabled: 'all'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
    });
});
