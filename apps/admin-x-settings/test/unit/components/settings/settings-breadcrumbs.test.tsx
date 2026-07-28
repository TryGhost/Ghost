import SettingsBreadcrumbs from '@src/components/settings/settings-breadcrumbs';
import assert from 'node:assert/strict';
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

describe('SettingsBreadcrumbs', () => {
    it('keeps its navigation buttons from submitting an enclosing form', () => {
        const handleBack = vi.fn();
        const handleSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

        const {container} = render(
            <form onSubmit={handleSubmit}>
                <SettingsBreadcrumbs
                    className='custom-class'
                    current='Black Friday'
                    label='Offers'
                    onBack={handleBack}
                />
            </form>
        );

        const back = screen.getByRole('button', {name: 'Back'});
        const ancestor = screen.getByRole('button', {name: 'Offers'});

        assert.equal(back.getAttribute('type'), 'button');
        assert.equal(ancestor.getAttribute('type'), 'button');
        assert.equal(screen.getByText('Black Friday').getAttribute('aria-current'), 'page');
        assert.ok(container.querySelector('.custom-class'));

        fireEvent.click(back);
        fireEvent.click(ancestor);

        assert.equal(handleBack.mock.calls.length, 2);
        assert.equal(handleSubmit.mock.calls.length, 0);
    });
});
