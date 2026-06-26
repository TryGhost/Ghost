import {render, fireEvent} from '../../../utils/test-utils';
import NewsletterSelectionPage from '../../../../src/components/pages/newsletter-selection-page';

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
    const {mockDoActionFn, ...utils} = render(
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
        mockDoActionFn,
        ...utils
    };
};

describe('NewsletterSelectionPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    test('calls doAction with signup data when continue is clicked', async () => {
        const {continueBtn, mockDoActionFn} = setup();

        fireEvent.click(continueBtn);

        expect(mockDoActionFn).toHaveBeenCalledWith('signup', {
            name: 'Test User',
            email: 'test@example.com',
            plan: 'free',
            phonenumber: undefined,
            newsletters: [{name: 'Free Newsletter', id: '1'}],
            offerId: undefined
        });
    });

    test('allows selecting multiple free newsletters', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        // Find and click the switch for the additional free newsletter
        const switches = getAllByTestId('switch-input');
        const additionalNewsletterSwitch = switches[1]; // Second switch (first is default)

        fireEvent.click(additionalNewsletterSwitch);
        fireEvent.click(continueBtn);

        // Verify both newsletters are included
        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('allows deselecting default newsletter', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        // Find and click the switch for the default newsletter
        const switches = getAllByTestId('switch-input');
        const defaultNewsletterSwitch = switches[0]; // First switch is default

        fireEvent.click(defaultNewsletterSwitch);
        fireEvent.click(continueBtn);

        // Verify no newsletters are included
        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: []
        }));
    });

    test('toggles newsletter when clicking the section surface (not the switch)', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        const sections = getAllByTestId('toggle-wrapper');
        fireEvent.click(sections[2]);
        fireEvent.click(continueBtn);

        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('toggles newsletter when pressing Enter on the focused section', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        const sections = getAllByTestId('toggle-wrapper');
        fireEvent.keyDown(sections[2], {key: 'Enter'});
        fireEvent.click(continueBtn);

        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('toggles newsletter when pressing Space on the focused section', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        const sections = getAllByTestId('toggle-wrapper');
        fireEvent.keyDown(sections[2], {key: ' '});
        fireEvent.click(continueBtn);

        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('ignores non-activation keys on the section', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        const sections = getAllByTestId('toggle-wrapper');
        fireEvent.keyDown(sections[2], {key: 'a'});
        fireEvent.keyDown(sections[2], {key: 'Tab'});
        fireEvent.click(continueBtn);

        // "Another Free Newsletter" should still NOT be subscribed
        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: [{name: 'Free Newsletter', id: '1'}]
        }));
    });

    test('clicking the inner switch does not double-fire the section toggle', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        const switches = getAllByTestId('switch-input');
        fireEvent.click(switches[1]);
        fireEvent.click(continueBtn);

        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('pressing Space on the inner switch does not double-fire the section toggle', async () => {
        const {getAllByTestId, continueBtn, mockDoActionFn} = setup();

        // Simulate Space-keydown on the nested checkbox: the native checkbox
        // toggles itself and the keydown bubbles to the section, but the
        // section's handler must bail out because target !== currentTarget.
        const switches = getAllByTestId('switch-input');
        fireEvent.click(switches[1]); // native toggle on the checkbox
        fireEvent.keyDown(switches[1], {key: ' ', bubbles: true});
        fireEvent.click(continueBtn);

        // Without the target guard, the bubbled keydown would re-toggle the
        // section, leaving "Another Free Newsletter" unsubscribed again.
        expect(mockDoActionFn).toHaveBeenCalledWith('signup', expect.objectContaining({
            newsletters: expect.arrayContaining([
                {name: 'Free Newsletter', id: '1'},
                {name: 'Another Free Newsletter', id: '3'}
            ])
        }));
    });

    test('section rows expose role="button" and tabIndex for keyboard reachability', () => {
        const {getAllByTestId} = setup();

        const sections = getAllByTestId('toggle-wrapper');
        const interactiveSections = sections.filter(s => s.getAttribute('role') === 'button');
        expect(interactiveSections).toHaveLength(2);
        interactiveSections.forEach((section) => {
            expect(section).toHaveAttribute('tabindex', '0');
        });
    });

    test('section rows expose aria-pressed matching the subscribed state', () => {
        const {getAllByTestId} = setup();

        const interactiveSections = getAllByTestId('toggle-wrapper').filter(s => s.getAttribute('role') === 'button');
        // Default: "Free Newsletter" is subscribed-on-signup; "Another Free Newsletter" is not.
        expect(interactiveSections[0]).toHaveAttribute('aria-pressed', 'true');
        expect(interactiveSections[1]).toHaveAttribute('aria-pressed', 'false');

        // Toggling flips aria-pressed.
        fireEvent.click(interactiveSections[1]);
        expect(interactiveSections[1]).toHaveAttribute('aria-pressed', 'true');
    });

    test('inner Switch is removed from the accessibility tree and focus order', () => {
        const {getAllByTestId, container} = setup();

        // Each interactive row's Switch is the single visual indicator, not an
        // independent accessible control. Verify both the wrapper is hidden
        // from SR and the input is removed from the tab order.
        const switchWrappers = container.querySelectorAll('.gh-portal-for-switch');
        expect(switchWrappers.length).toBeGreaterThan(0);
        switchWrappers.forEach((wrapper) => {
            expect(wrapper).toHaveAttribute('aria-hidden', 'true');
        });

        const inputs = container.querySelectorAll('input[type="checkbox"]');
        expect(inputs.length).toBeGreaterThan(0);
        inputs.forEach((input) => {
            expect(input).toHaveAttribute('tabindex', '-1');
        });

        // Sanity check: switches still exist as visible toggles.
        expect(getAllByTestId('switch-input').length).toBeGreaterThan(0);
    });
});
