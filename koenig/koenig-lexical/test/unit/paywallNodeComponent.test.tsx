import CardContext from '../../src/context/CardContext';
import KoenigComposerContext from '../../src/context/KoenigComposerContext';
import React from 'react';
import {PaywallNodeComponent} from '../../src/nodes/PaywallNodeComponent';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {vi} from 'vitest';

const lexicalMocks = vi.hoisted(() => ({
    node: {},
    update: vi.fn(callback => callback())
}));

vi.mock('lexical', async (importOriginal) => {
    const actual = await importOriginal<typeof import('lexical')>();
    return {
        ...actual,
        $getNodeByKey: vi.fn(() => lexicalMocks.node)
    };
});

vi.mock('@lexical/react/LexicalComposerContext', () => ({
    useLexicalComposerContext: () => [{update: lexicalMocks.update}]
}));

vi.mock('../../src/components/ui/SettingsPanel', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/components/ui/SettingsPanel')>();
    const ReactModule = await import('react');

    return {
        ...actual,
        SettingsPanel: ({children, defaultTab, tabs}) => {
            const [activeTab, setActiveTab] = ReactModule.useState(defaultTab || tabs?.[0]?.id);

            return (
                <div data-testid="settings-panel">
                    {tabs?.map(tab => (
                        <button key={tab.id} data-testid={`tab-${tab.id}`} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
                    ))}
                    {tabs ? children[activeTab] : children}
                </div>
            );
        }
    };
});

describe('PaywallNodeComponent', () => {
    beforeEach(() => {
        lexicalMocks.node = {};
        lexicalMocks.update.mockClear();
    });

    it('explains post access and edits specific tiers', async () => {
        let access = 'paid';
        let selectedTiers = [];
        const listeners = new Set<() => void>();
        const notify = () => listeners.forEach(listener => listener());
        const onTiersChange = vi.fn((tiers) => {
            selectedTiers = tiers;
            notify();
        });
        const postAccess = {
            fetchTiers: vi.fn().mockResolvedValue([
                {id: 'gold', name: 'Gold', slug: 'gold'},
                {id: 'silver', name: 'Silver', slug: 'silver'}
            ]),
            getSelectedTiers: () => selectedTiers,
            getValue: () => access,
            onChange: vi.fn((value) => {
                access = value;
                notify();
            }),
            onTiersChange,
            subscribe: (listener) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
        };

        render(
            <KoenigComposerContext.Provider value={{cardConfig: {postAccess, siteTitle: 'Test Blog'}, darkMode: false}}>
                <CardContext.Provider value={{
                    cardContainerRef: React.createRef(),
                    cardWidth: 'regular',
                    captionHasFocus: false,
                    isEditing: true,
                    isSelected: true,
                    nodeKey: 'paywall',
                    setCaptionHasFocus: vi.fn(),
                    setCardWidth: vi.fn(),
                    setEditing: vi.fn()
                }}>
                    <PaywallNodeComponent nodeKey="paywall" />
                </CardContext.Provider>
            </KoenigComposerContext.Provider>
        );

        expect(screen.getByText('Choose who can read the full post. Everyone else can only read the public preview.')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('tab-content'));
        expect(screen.getByTestId('tab-content')).toHaveTextContent('Email paywall');
        expect(screen.getByTestId('paywall-email-title')).toHaveValue('Upgrade to continue reading.');
        expect(screen.getByTestId('paywall-email-body')).toHaveValue('Become a paid member of Test Blog to get access to all premium content.');
        expect(screen.getByTestId('paywall-email-body')).toHaveAttribute('rows', '3');
        expect(screen.getByTestId('paywall-email-button-text')).toHaveValue('Upgrade');
        expect(screen.getByTestId('paywall-email-button-url')).toHaveValue('#/portal/signup');

        fireEvent.change(screen.getByTestId('paywall-email-title'), {target: {value: 'Keep reading'}});
        fireEvent.change(screen.getByTestId('paywall-email-body'), {target: {value: 'Join to read the rest.'}});
        fireEvent.change(screen.getByTestId('paywall-email-button-text'), {target: {value: 'Join now'}});
        fireEvent.change(screen.getByTestId('paywall-email-button-url'), {target: {value: 'https://example.com/join'}});

        expect(lexicalMocks.node).toMatchObject({
            emailTitle: 'Keep reading',
            emailBody: 'Join to read the rest.',
            emailButtonText: 'Join now',
            emailButtonUrl: 'https://example.com/join'
        });

        fireEvent.click(screen.getByTestId('tab-access'));
        expect(screen.getByText('Choose who can read the full post. Everyone else can only read the public preview.')).toBeInTheDocument();
        await waitFor(() => expect(postAccess.fetchTiers).toHaveBeenCalledOnce());

        fireEvent.click(screen.getByTestId('paywall-post-access-value'));
        fireEvent.mouseDown(screen.getByRole('button', {name: 'Specific tier(s)'}));

        const tierInput = await screen.findByPlaceholderText('Select a tier');
        expect(screen.getByText('Paid tiers')).toHaveClass('sr-only');
        expect(screen.queryByText('Only these paid tiers can read beyond the preview.')).not.toBeInTheDocument();
        fireEvent.focus(tierInput);
        fireEvent.mouseDown(await screen.findByRole('button', {name: 'Gold'}));

        await waitFor(() => {
            expect(onTiersChange).toHaveBeenCalledWith([{id: 'gold', name: 'Gold', slug: 'gold'}]);
        });
        expect(screen.getByTestId('multiselect-dropdown-selected')).toHaveTextContent('Gold');

        fireEvent.click(screen.getByTestId('paywall-post-access-value'));
        fireEvent.mouseDown(screen.getByRole('button', {name: 'Members only'}));
        expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
    });

    it('previews the email paywall as a free member', () => {
        const openFreeEmailPreview = vi.fn();
        render(
            <KoenigComposerContext.Provider value={{cardConfig: {openFreeEmailPreview, postAccess: {getValue: () => 'paid'}, siteTitle: 'Test Blog'}, darkMode: false}}>
                <CardContext.Provider value={{
                    cardContainerRef: React.createRef(),
                    cardWidth: 'regular',
                    captionHasFocus: false,
                    isEditing: true,
                    isSelected: true,
                    nodeKey: 'paywall',
                    setCaptionHasFocus: vi.fn(),
                    setCardWidth: vi.fn(),
                    setEditing: vi.fn()
                }}>
                    <PaywallNodeComponent nodeKey="paywall" />
                </CardContext.Provider>
            </KoenigComposerContext.Provider>
        );

        fireEvent.click(screen.getByTestId('tab-content'));
        expect(screen.getByTestId('paywall-email-title')).toHaveValue('Upgrade to continue reading.');
        expect(screen.getByTestId('paywall-email-body')).toHaveValue('Become a paid member of Test Blog to get access to all premium content.');
        expect(screen.getByTestId('paywall-email-button-text')).toHaveValue('Upgrade');
        expect(screen.getByTestId('paywall-email-button-url')).toHaveValue('#/portal/signup');
        expect(screen.getByTestId('paywall-email-preview-footer')).toBeInTheDocument();
        expect(screen.getByTestId('paywall-email-preview-link')).toHaveTextContent('Preview email paywall');
        fireEvent.click(screen.getByTestId('paywall-email-preview-link'));
        expect(openFreeEmailPreview).toHaveBeenCalledOnce();
    });

    it.each([
        ['public', false],
        ['members', false],
        ['paid', true],
        ['tiers', true]
    ])('gates email content for %s access', (access, isVisible) => {
        render(
            <KoenigComposerContext.Provider value={{cardConfig: {postAccess: {getValue: () => access}}, darkMode: false}}>
                <CardContext.Provider value={{
                    cardContainerRef: React.createRef(),
                    cardWidth: 'regular',
                    captionHasFocus: false,
                    isEditing: true,
                    isSelected: true,
                    nodeKey: 'paywall',
                    setCaptionHasFocus: vi.fn(),
                    setCardWidth: vi.fn(),
                    setEditing: vi.fn()
                }}>
                    <PaywallNodeComponent nodeKey="paywall" />
                </CardContext.Provider>
            </KoenigComposerContext.Provider>
        );

        if (isVisible) {
            expect(screen.getByTestId('tab-content')).toHaveTextContent('Email paywall');
        } else {
            expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
        }
    });
});
