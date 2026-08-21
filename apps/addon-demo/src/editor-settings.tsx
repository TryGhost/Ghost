import {GhEditorInput, GhEditorSelect, GhEditorToggle, type AddonEditorSettingsBridge} from '@tryghost/addon-kit/editor-settings';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

function Settings({ghost}: {ghost: AddonEditorSettingsBridge}) {
    const [props, setProps] = useState(() => ghost.props);

    useEffect(() => ghost.onPropsChange(setProps), [ghost]);

    const propose = async (patch: Record<string, unknown>) => {
        setProps(current => ({...current, ...patch}));
        await ghost.proposePatch(patch);
    };

    const mode = props.mode === 'custom' ? 'custom' : 'summary';

    return (
        <>
            <GhEditorSelect
                label="Display mode"
                options={[
                    {label: 'Default summary', value: 'summary'},
                    {label: 'Custom headline', value: 'custom'}
                ]}
                value={mode}
                onChange={event => void propose({mode: event.detail})}
            />
            {mode === 'custom' && (
                <GhEditorInput
                    description="Used as the card headline."
                    label="Headline"
                    placeholder="Search preview ready"
                    value={typeof props.title === 'string' ? props.title : ''}
                    onChange={event => void propose({title: event.detail})}
                />
            )}
            <GhEditorToggle
                checked={props.showStatus !== false}
                description="Show the current SEO assessment."
                label="Status badge"
                onChange={event => void propose({showStatus: event.detail})}
            />
        </>
    );
}

export default function renderEditorSettings(ghost: AddonEditorSettingsBridge) {
    if (ghost.blockName !== 'seo-summary') {
        throw new Error(`Unknown editor block: ${ghost.blockName}`);
    }
    render(<Settings ghost={ghost} />, document.body);
}
