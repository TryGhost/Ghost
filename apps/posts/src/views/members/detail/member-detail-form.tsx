import MemberLabelsField from './member-labels-field';
import MemberNewslettersField from './member-newsletters-field';
import React from 'react';
import {Input, Label, Textarea} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';
import {getMemberNewslettersUiEnabled, getNoteCharactersLeft} from './member-detail-edit';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {MemberEditableFields} from './member-detail-edit';

interface MemberDetailFormProps {
    draft: MemberEditableFields;
    emailError?: string | null;
    disabled?: boolean;
    // In create mode the server picks the default newsletters via `subscribe_on_signup`
    // (`member-repository.js:461`). We don't send `newsletters` on create, so showing
    // toggles here would silently discard the user's choices — hide the section instead.
    isCreating?: boolean;
    memberId?: string;
    emailSuppression?: Member['email_suppression'];
    onChange: (patch: Partial<MemberEditableFields>) => void;
}

const MemberDetailForm: React.FC<MemberDetailFormProps> = ({draft, emailError, disabled, isCreating, memberId, emailSuppression, onChange}) => {
    // Soft limit: the note can be typed past 500 (Ember has no hard cap); the counter
    // just turns negative and red.
    const noteCharactersLeft = getNoteCharactersLeft(draft.note);

    // Ember hides the newsletter section entirely when the site has emails disabled
    // via `editor_default_email_recipients` (matches `gh-member-settings-form.hbs`).
    const {data: settingsData} = useBrowseSettings({});
    const showNewsletters = getMemberNewslettersUiEnabled(
        getSettingValue<string>(settingsData?.settings, 'editor_default_email_recipients')
    );

    return (
        <div className='flex max-w-xl flex-col gap-5' data-testid='member-detail-form'>
            <div className='flex flex-col gap-1.5'>
                <Label htmlFor='member-name'>Name</Label>
                <Input
                    disabled={disabled}
                    id='member-name'
                    value={draft.name}
                    onChange={e => onChange({name: e.target.value})}
                />
            </div>

            <div className='flex flex-col gap-1.5'>
                <Label htmlFor='member-email'>Email</Label>
                <Input
                    aria-invalid={!!emailError}
                    disabled={disabled}
                    id='member-email'
                    type='email'
                    value={draft.email}
                    onChange={e => onChange({email: e.target.value})}
                />
                {emailError && <p className='text-sm text-destructive'>{emailError}</p>}
            </div>

            <div className='flex flex-col gap-1.5'>
                <Label>Labels</Label>
                <MemberLabelsField disabled={disabled} labels={draft.labels} onChange={nextLabels => onChange({labels: nextLabels})} />
            </div>

            {showNewsletters && !isCreating && memberId && (
                <MemberNewslettersField
                    disabled={disabled}
                    emailSuppression={emailSuppression}
                    memberId={memberId}
                    subscribedIds={draft.newsletters}
                    onChange={nextIds => onChange({newsletters: nextIds})}
                />
            )}

            <div className='flex flex-col gap-1.5'>
                <Label htmlFor='member-note'>Note</Label>
                <Textarea
                    disabled={disabled}
                    id='member-note'
                    value={draft.note}
                    onChange={e => onChange({note: e.target.value})}
                />
                <p className={cn('text-right text-xs text-muted-foreground', noteCharactersLeft < 0 && 'text-destructive')}>
                    {noteCharactersLeft} characters left
                </p>
            </div>
        </div>
    );
};

export default MemberDetailForm;
