import CardContext from '../../src/context/CardContext';
import {CallToActionCard} from '../../src/components/ui/cards/CallToActionCard';
import {EmailCtaCard} from '../../src/components/ui/cards/EmailCtaCard';
import {HeaderCard as HeaderCardV1} from '../../src/components/ui/cards/HeaderCard/v1/HeaderCard';
import {HeaderCard as HeaderCardV2} from '../../src/components/ui/cards/HeaderCard/v2/HeaderCard';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {useContext} from 'react';

vi.mock('../../src/components/KoenigNestedEditor', () => ({default: () => null}));
vi.mock('../../src/utils/isEditorEmpty', () => ({isEditorEmpty: () => false}));

afterEach(cleanup);

function Preview({readOnly, children}) {
    const context = useContext(CardContext);
    return <CardContext.Provider value={{...context, readOnly}}>{children}</CardContext.Provider>;
}

const cards = [
    {name: 'header v1', Component: HeaderCardV1, props: {button: true, type: 'light', size: 'small'}},
    {name: 'header v2', Component: HeaderCardV2, props: {buttonEnabled: true, layout: 'regular', alignment: 'center', backgroundColor: '#ffffff', textColor: '#000000'}},
    {name: 'call to action', Component: CallToActionCard, props: {showButton: true}},
    {name: 'email call to action', Component: EmailCtaCard, props: {showButton: true}}
];

describe.each(cards)('$name preview links', ({Component, props}) => {
    it('uses the saved URL in a read-only preview', () => {
        render(<Preview readOnly={true}><Component {...props} buttonText="Visit website" buttonUrl="https://example.com/" /></Preview>);
        expect(screen.getByRole('link', {name: 'Visit website'}).getAttribute('href')).toBe('https://example.com/');
    });

    it('keeps the button inert in the editable post', () => {
        render(<Preview readOnly={false}><Component {...props} buttonText="Visit website" buttonUrl="https://example.com/" /></Preview>);
        expect(screen.queryByRole('link', {name: 'Visit website'})).toBeNull();
        expect(screen.getByRole('button', {name: 'Visit website'})).toBeTruthy();
    });

    it('does not turn an unsafe saved URL into a link', () => {
        render(<Preview readOnly={true}><Component {...props} buttonText="Visit website" buttonUrl="javascript:alert(1)" /></Preview>);
        expect(screen.queryByRole('link', {name: 'Visit website'})).toBeNull();
    });
});
