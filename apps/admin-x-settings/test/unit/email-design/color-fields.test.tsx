import assert from 'node:assert/strict';
import {BackgroundColorField} from '@src/components/settings/email-design/design-fields/background-color-field';
import {ButtonColorField} from '@src/components/settings/email-design/design-fields/button-color-field';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {DividerColorField} from '@src/components/settings/email-design/design-fields/divider-color-field';
import {EmailDesignProvider} from '@src/components/settings/email-design/email-design-context';
import {HeaderBackgroundField} from '@src/components/settings/email-design/design-fields/header-background-field';
import {LinkColorField} from '@src/components/settings/email-design/design-fields/link-color-field';
import {type ReactNode} from 'react';
import {SectionTitleColorField} from '@src/components/settings/email-design/design-fields/section-title-color-field';
import {act, fireEvent, render, screen} from '@testing-library/react';

type EmailDesignUpdate = Partial<typeof DEFAULT_EMAIL_DESIGN>;
type OnSettingsChange = (update: EmailDesignUpdate) => void;

const renderField = (field: ReactNode, settings = DEFAULT_EMAIL_DESIGN, accentColor = '#ff0088', onSettingsChange: OnSettingsChange = () => {}) => {
    return render(
        <EmailDesignProvider
            accentColor={accentColor}
            settings={settings}
            onSettingsChange={onSettingsChange}
        >
            {field}
        </EmailDesignProvider>
    );
};

const openPicker = (label: string) => {
    fireEvent.click(screen.getByText(label));
};

describe('Email design color fields', function () {
    it('renders accent-backed button colors using the resolved accent color', function () {
        renderField(<ButtonColorField />, {...DEFAULT_EMAIL_DESIGN, button_color: 'accent'});

        const trigger = screen.getByRole('button', {name: 'Pick color'});
        const swatch = trigger.querySelector(String.raw`.inset-\[3px\]`);

        assert.ok(swatch);
        assert.equal(swatch.getAttribute('style')?.includes('rgb(255, 0, 136)'), true);
    });

    it('renders accent-backed link colors using the resolved accent color', function () {
        renderField(<LinkColorField />, {...DEFAULT_EMAIL_DESIGN, link_color: 'accent'}, '#00aaee');

        const trigger = screen.getByRole('button', {name: 'Pick color'});
        const swatch = trigger.querySelector(String.raw`.inset-\[3px\]`);

        assert.ok(swatch);
        assert.equal(swatch.getAttribute('style')?.includes('rgb(0, 170, 238)'), true);
    });

    it('shows semantic swatches for each configured welcome-email color field', function () {
        const background = renderField(<BackgroundColorField />);
        openPicker('Background color');
        assert.ok(screen.getByRole('button', {name: 'White'}));
        background.unmount();

        const header = renderField(<HeaderBackgroundField />);
        openPicker('Header background color');
        const transparentSwatch = screen.getByRole('button', {name: 'Transparent'});
        const pickerTrigger = screen.getByRole('button', {name: 'Pick color'});
        assert.ok(transparentSwatch);
        assert.ok(transparentSwatch.querySelector('[data-testid="transparent-indicator"]'));
        assert.equal(pickerTrigger.querySelector('[data-testid="transparent-indicator"]'), null);
        header.unmount();

        const sectionTitle = renderField(<SectionTitleColorField />);
        openPicker('Section title color');
        assert.ok(screen.getByRole('button', {name: 'Auto'}));
        assert.ok(screen.getByRole('button', {name: 'Accent'}));
        sectionTitle.unmount();

        const button = renderField(<ButtonColorField />);
        openPicker('Button color');
        assert.ok(screen.getByRole('button', {name: 'Auto'}));
        assert.ok(screen.getByRole('button', {name: 'Accent'}));
        button.unmount();

        const link = renderField(<LinkColorField />);
        openPicker('Link color');
        assert.ok(screen.getByRole('button', {name: 'Auto'}));
        assert.ok(screen.getByRole('button', {name: 'Accent'}));
        link.unmount();

        const divider = renderField(<DividerColorField />);
        openPicker('Divider color');
        assert.ok(screen.getByRole('button', {name: 'Light'}));
        assert.ok(screen.getByRole('button', {name: 'Accent'}));
        divider.unmount();
    });

    it('stores semantic values when selecting accent and auto swatches', function () {
        const updates: Array<{button_color?: string | null}> = [];
        renderField(
            <ButtonColorField />,
            {...DEFAULT_EMAIL_DESIGN, background_color: '#ffffff', button_color: '#123456'},
            '#ff0088',
            update => updates.push(update)
        );

        openPicker('Button color');
        updates.length = 0;
        fireEvent.click(screen.getByRole('button', {name: 'Accent'}));
        assert.equal(updates.at(-1)?.button_color, 'accent');

        openPicker('Button color');
        updates.length = 0;
        fireEvent.click(screen.getByRole('button', {name: 'Auto'}));
        assert.equal(updates.at(-1)?.button_color, null);
    });

    it('stores semantic values for light and transparent swatches', function () {
        const updates: Array<{background_color?: string; header_background_color?: string}> = [];
        renderField(
            <>
                <BackgroundColorField />
                <HeaderBackgroundField />
            </>,
            {...DEFAULT_EMAIL_DESIGN, background_color: '#121212', header_background_color: '#ff0000'},
            '#ff0088',
            update => updates.push(update)
        );

        openPicker('Background color');
        updates.length = 0;
        fireEvent.click(screen.getByRole('button', {name: 'White'}));
        assert.equal(updates.at(-1)?.background_color, 'light');

        openPicker('Header background color');
        updates.length = 0;
        fireEvent.click(screen.getByRole('button', {name: 'Transparent'}));
        assert.equal(updates.at(-1)?.header_background_color, 'transparent');
    });

    it('stores null when selecting divider Light swatch', function () {
        const updates: Array<{divider_color?: string | null}> = [];
        renderField(
            <DividerColorField />,
            {...DEFAULT_EMAIL_DESIGN, divider_color: '#333333'},
            '#ff0088',
            update => updates.push(update)
        );

        openPicker('Divider color');
        updates.length = 0;
        fireEvent.click(screen.getByRole('button', {name: 'Light'}));

        assert.equal(updates.at(-1)?.divider_color, null);
    });

    it('uses background contrast to render Auto swatch color', function () {
        renderField(
            <SectionTitleColorField />,
            {...DEFAULT_EMAIL_DESIGN, background_color: '#111111', section_title_color: null}
        );

        openPicker('Section title color');
        const autoSwatch = screen.getByRole('button', {name: 'Auto'});

        assert.equal(autoSwatch.getAttribute('style')?.includes('rgb(255, 255, 255)'), true);
    });

    it('stores hex values when choosing a custom color in the picker', function () {
        const updates: Array<{button_color?: string | null}> = [];
        renderField(
            <ButtonColorField />,
            {...DEFAULT_EMAIL_DESIGN, button_color: 'accent'},
            '#ff0088',
            update => updates.push(update)
        );

        openPicker('Button color');
        updates.length = 0;
        const hexInput = screen.getByRole('textbox');
        fireEvent.pointerDown(hexInput);
        fireEvent.input(hexInput, {target: {value: '#123456'}});
        fireEvent.change(hexInput, {target: {value: '#123456'}});

        assert.equal(updates.some(update => update.button_color?.toLowerCase() === '#123456'), true);
    });

    it('does not mutate transparent header background when opening the picker', async function () {
        const updates: Array<{header_background_color?: string}> = [];
        renderField(
            <HeaderBackgroundField />,
            {...DEFAULT_EMAIL_DESIGN, header_background_color: 'transparent'},
            '#ff0088',
            update => updates.push(update)
        );

        await act(async () => {
            openPicker('Header background color');
            await Promise.resolve();
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
        });

        const hexInput = screen.getByRole('textbox');
        assert.equal(updates.length, 0);
        assert.equal(hexInput.getAttribute('value')?.toLowerCase(), '#000000');
    });
});
