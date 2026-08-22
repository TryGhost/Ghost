import {GhEditorInput, type AddonEditorSettingsBridge} from '@tryghost/addon-kit/editor-settings';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

function stringProperty(props: Record<string, unknown>, name: string) {
    return typeof props[name] === 'string' ? props[name] : '';
}

function Settings({ghost}: {ghost: AddonEditorSettingsBridge}) {
    const [props, setProps] = useState(() => ghost.props);

    useEffect(() => ghost.onPropsChange(setProps), [ghost]);

    const propose = async (patch: Record<string, unknown>) => {
        setProps(current => ({...current, ...patch}));
        await ghost.proposePatch(patch);
    };

    const timezone = ghost.context?.siteTimezone || 'UTC';

    return (
        <>
            <GhEditorInput label="Title" value={stringProperty(props, 'title')} onChange={event => void propose({title: event.detail})} />
            <GhEditorInput
                description={`ISO date and time with Z or an explicit offset. Displayed in the site timezone (${timezone}).`}
                label="Starts at"
                placeholder="2026-10-15T16:30:00.000Z"
                value={stringProperty(props, 'startsAt')}
                onChange={event => void propose({startsAt: event.detail})}
            />
            <GhEditorInput label="Location" value={stringProperty(props, 'location')} onChange={event => void propose({location: event.detail})} />
            <GhEditorInput label="Description" value={stringProperty(props, 'description')} onChange={event => void propose({description: event.detail})} />
            <GhEditorInput label="Event URL" value={stringProperty(props, 'url')} onChange={event => void propose({url: event.detail})} />
        </>
    );
}

export default function renderEditorSettings(ghost: AddonEditorSettingsBridge) {
    if (ghost.blockName !== 'event') {
        throw new Error(`Unknown editor block: ${ghost.blockName}`);
    }
    render(<Settings ghost={ghost} />, document.body);
}
