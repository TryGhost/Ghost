import {TabView} from '../../src/components/ui/TabView';
import {fireEvent, render, screen} from '@testing-library/react';

describe('TabView', () => {
    it('keeps the panel mounted and falls back when the active tab is removed', () => {
        const tabContent = {
            access: <div>Access settings</div>,
            content: <div>Email paywall settings</div>
        };
        const paidTabs = [
            {id: 'access', label: 'Access'},
            {id: 'content', label: 'Email paywall'}
        ];
        const {rerender} = render(<TabView defaultTab="access" tabContent={tabContent} tabs={paidTabs} />);

        fireEvent.click(screen.getByTestId('tab-content'));
        expect(screen.getByTestId('tab-contents-content')).toHaveTextContent('Email paywall settings');

        rerender(<TabView defaultTab="access" tabContent={tabContent} tabs={[paidTabs[0]]} />);
        expect(screen.getByTestId('tab-contents-access')).toHaveTextContent('Access settings');

        rerender(<TabView defaultTab="access" tabContent={tabContent} tabs={paidTabs} />);
        expect(screen.getByTestId('tab-contents-access')).toHaveTextContent('Access settings');
    });
});
