import React from 'react';
import {Toggle} from './Toggle';
import {useVisibilityToggle} from '../../hooks/useVisibilityToggle.js';

export function VisibilityDropdown({editor, nodeKey, visibility, isActive}) {
    const [emailVisibility, toggleEmail, toggleMembers, freeMemberVisibility, paidMemberVisibility] = useVisibilityToggle(editor, nodeKey, visibility);

    if (!isActive) {
        return <></>;
    }

    if (isActive) {
        return (
            <div className="absolute left-1/2 top-0 z-[1001] flex w-[254px] -translate-x-1/2 flex-col gap-1 rounded-lg bg-white p-6 shadow-md" data-kg-allow-clickthrough="false" data-testid="visibility-settings">
                <div className="text-sm font-bold">Visibility</div>
                <ToggleSetting
                    dataTestId='visibility-toggle-email-only'
                    isChecked={emailVisibility}
                    label="Show in email only"
                    onChange={e => toggleEmail(e)} />
                {
                    emailVisibility && (
                        <>
                            <hr className="mt-1 border-grey-250 pb-1 dark:border-white/5" />
                            <ToggleSetting
                                dataTestId='visibility-toggle-free-members'
                                isChecked={freeMemberVisibility}
                                label="Free members"
                                onChange={e => toggleMembers(e, 'free')}
                            />
                            <ToggleSetting
                                dataTestId='visibility-toggle-paid-members'
                                isChecked={paidMemberVisibility}
                                label="Paid members"
                                onChange={e => toggleMembers(e, 'paid')}
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
