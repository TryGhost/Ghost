import React from 'react';
import {Dropdown} from './Dropdown';
import {Toggle} from './Toggle';
// import {useVisibilityToggle} from '../../hooks/useVisibilityToggle.js';

export function VisibilityDropdown({editor, nodeKey, visibility, isActive, visibilityProps}) {
    const {toggleEmail, toggleSegment, toggleWeb, segment, emailVisibility, webVisibility, dropdownOptions} = visibilityProps;
    // const [toggleEmail, toggleSegment, toggleWeb, segment, emailVisibility, webVisibility, dropdownOptions] = useVisibilityToggle(editor, nodeKey, visibility);

    if (!isActive) {
        return <></>;
    }

    if (isActive) {
        return (
            <div className="not-kg-prose absolute left-1/2 top-0 z-[1001] flex w-[254px] -translate-x-1/2 flex-col gap-1 rounded-lg bg-white p-6 shadow-md" data-kg-allow-clickthrough="false" data-testid="visibility-settings">
                <div className="text-sm font-bold">Visibility</div>
                <ToggleSetting
                    dataTestId='visibility-toggle-web-only'
                    isChecked={webVisibility}
                    label="Show on web"
                    onChange={e => toggleWeb(e)} />
                <hr className="mt-1 border-grey-250 pb-1 dark:border-white/5" />
                <ToggleSetting
                    dataTestId='visibility-toggle-email-only'
                    isChecked={emailVisibility}
                    label="Show in email"
                    onChange={e => toggleEmail(e)} />
                {
                    emailVisibility && (
                        <>
                            <Dropdown
                                dataTestId={'visibility-dropdown-segment'}
                                menu={dropdownOptions}
                                value={segment}
                                onChange={toggleSegment}
                            />
                        </>
                    )
                }
            </div>
        );
    }
}

function ToggleSetting({label, isChecked, onChange, dataTestId}) {
    return (
        <div className="flex min-h-[3rem] w-full items-center justify-between text-sm">
            <label className="text-grey-900 dark:text-grey-300">{label}</label>
            <div className="flex shrink-0 pl-2">
                <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
            </div>
        </div>
    );
}