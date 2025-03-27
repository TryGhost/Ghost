import {render, fireEvent} from '../../utils/test-utils';
import NewsletterSelectionPage from './NewsletterSelectionPage';

const mockNewsletters = [
    {
        id: '1',
        name: 'Free Newsletter',
        description: 'Free newsletter description',
        paid: false,
        subscribe_on_signup: true
    },
    {
        id: '2',
        name: 'Paid Newsletter',
        description: 'Paid newsletter description',
        paid: true,
        subscribe_on_signup: false
    },
    {
        id: '3',
        name: 'Another Free Newsletter',
        description: 'Another free newsletter description',
        paid: false,
        subscribe_on_signup: false
    }
];

const setup = () => {
    const {mockOnActionFn, ...utils} = render(
        <NewsletterSelectionPage
            pageData={{
                name: 'Test User',
                email: 'test@example.com',
                plan: 'free'
            }}
            onBack={() => {}}
        />,
        {
            overrideContext: {
                site: {
                    newsletters: mockNewsletters
                }
            }
        }
    );
    const title = utils.getByText(/Choose your newsletters/i);
    const continueBtn = utils.getByRole('button', {name: /Continue/i});
    return {
        title,
        continueBtn,
        mockOnActionFn,
        ...utils
    };
};

describe('NewsletterSelectionPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const {title, continueBtn} = setup();

        expect(title).toBeInTheDocument();
        expect(continueBtn).toBeInTheDocument();
    });

    test('shows free newsletter as toggleable', () => {
        const {getByText} = setup();
        const freeNewsletter = getByText('Free Newsletter');
        expect(freeNewsletter).toBeInTheDocument();
    });

    test('shows paid newsletter with lock icon', () => {
        const {getByText, getByTitle} = setup();
        const paidNewsletter = getByText('Paid Newsletter');
        const lockIcon = getByTitle('Unlock access to all newsletters by becoming a paid subscriber.');

        expect(paidNewsletter).toBeInTheDocument();
        expect(lockIcon).toBeInTheDocument();
    });

    test('calls onAction with signup data when continue is clicked', async () => {
        const {continueBtn, mockOnActionFn} = setup();

        fireEvent.click(continueBtn);

        expect(mockOnActionFn).toHaveBeenCalledWith('signup', {
            name: 'Test User',
            email: 'test@example.com',
            plan: 'free',
            phonenumber: undefined,
            newsletters: [{name: 'Free Newsletter', id: '1'}],
            offerId: undefined
        });
    });

    test('allows selecting multiple free newsletters', async () => {
        const {getAllByTestId, continueBtn, mockOnActionFn} = setup();

        // Find and click the switch for the additional free newsletter
        const switches = getAllByTestId('switch-input');
        const additionalNewsletterSwitch = switches[1]; // Second switch (first is default)

        fireEvent.click(additionalNewsletterSwitch);
        fireEvent.click(continueBtn);

        // Verify both newsletters are included
        expect(mockOnActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('allows deselecting default newsletter', async () => {
        const {getAllByTestId, continueBtn, mockOnActionFn} = setup();

        // Find and click the switch for the default newsletter
        const switches = getAllByTestId('switch-input');
        const defaultNewsletterSwitch = switches[0]; // First switch is default

        fireEvent.click(defaultNewsletterSwitch);
        fireEvent.click(continueBtn);

        // Verify no newsletters are included
        expect(mockOnActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: []
        }));
    });
});
