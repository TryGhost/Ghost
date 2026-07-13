import React from 'react';
import {BG_ORDER, BG_SWATCHES, type DesignStyles} from './paywall-data';
import {type ColorOption, ColorPopover, SegmentedControl} from './PaywallControls';

const Row: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-grey-900 dark:text-grey-300'>{label}</span>
        {children}
    </div>
);

const Field: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <div className='flex flex-col gap-2'>
        <span className='text-sm font-medium text-grey-900 dark:text-grey-300'>{label}</span>
        {children}
    </div>
);

const PaywallDesignPanel: React.FC<{
    styles: DesignStyles;
    accentColor: string;
    onChange: (prop: keyof DesignStyles, value: string) => void;
}> = ({styles, accentColor, onChange}) => {
    const backgroundOptions: ColorOption[] = BG_ORDER.map(bg => ({
        value: bg,
        label: bg.charAt(0).toUpperCase() + bg.slice(1),
        color: BG_SWATCHES[bg],
        none: bg === 'none',
        border: bg === 'white'
    }));

    const buttonOptions: ColorOption[] = [
        {value: 'accent', label: 'Accent', color: accentColor},
        {value: '#000000', label: 'Black', color: '#000000'}
    ];

    const linkOptions: ColorOption[] = [
        {value: 'text', label: 'Text', color: '#394047'},
        {value: 'accent', label: 'Accent', color: accentColor}
    ];

    return (
        <div className='flex flex-col gap-5'>
            <div>
                <div className='font-semibold text-black dark:text-white'>Global styles</div>
                <p className='mt-1 text-sm text-grey-700'>Applied to every card. Edit a card directly to override it.</p>
            </div>

            <Row label='Background'>
                <ColorPopover options={backgroundOptions} value={styles.backgroundColor} onChange={value => onChange('backgroundColor', value)} />
            </Row>

            <Row label='Button color'>
                <ColorPopover options={buttonOptions} value={styles.buttonColor} onChange={value => onChange('buttonColor', value)} />
            </Row>

            <Row label='Link color'>
                <ColorPopover options={linkOptions} value={styles.linkColor} onChange={value => onChange('linkColor', value)} />
            </Row>

            <Field label='Layout'>
                <SegmentedControl
                    options={[{value: 'minimal', label: 'Minimum'}, {value: 'immersive', label: 'Full'}]}
                    value={styles.layout}
                    onChange={value => onChange('layout', value)}
                />
            </Field>

            <Field label='Alignment'>
                <SegmentedControl
                    options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}]}
                    value={styles.alignment}
                    onChange={value => onChange('alignment', value)}
                />
            </Field>
        </div>
    );
};

export default PaywallDesignPanel;
