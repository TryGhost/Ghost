import * as assert from 'assert/strict';
import React from 'react';
import {ButtonColorField} from '@src/components/settings/email-design/design-fields/button-color-field';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {EmailDesignProvider} from '@src/components/settings/email-design/email-design-context';
import {LinkColorField} from '@src/components/settings/email-design/design-fields/link-color-field';
import {render, screen} from '@testing-library/react';

describe('Email design color fields', function () {
    it('renders accent-backed button colors using the resolved accent color', function () {
        render(
            <EmailDesignProvider
                accentColor="#ff0088"
                settings={{...DEFAULT_EMAIL_DESIGN, button_color: 'accent'}}
                onSettingsChange={() => {}}
            >
                <ButtonColorField />
            </EmailDesignProvider>
        );

        const trigger = screen.getByRole('button', {name: 'Button color'});
        const swatch = trigger.querySelector('span');

        assert.ok(swatch);
        assert.equal(swatch.style.background, 'rgb(255, 0, 136)');
    });

    it('renders accent-backed link colors using the resolved accent color', function () {
        render(
            <EmailDesignProvider
                accentColor="#00aaee"
                settings={{...DEFAULT_EMAIL_DESIGN, link_color: 'accent'}}
                onSettingsChange={() => {}}
            >
                <LinkColorField />
            </EmailDesignProvider>
        );

        const trigger = screen.getByRole('button', {name: 'Link color'});
        const swatch = trigger.querySelector('span');

        assert.ok(swatch);
        assert.equal(swatch.style.background, 'rgb(0, 170, 238)');
    });
});
