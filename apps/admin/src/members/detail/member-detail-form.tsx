import MemberLabelsField from './member-labels-field';
import React from 'react';
import {Input, InputGroup, InputGroupAddon, InputGroupTextarea, Label} from '@tryghost/shade/components';
import {NOTE_MAX_LENGTH, getNoteCharactersLeft} from './member-detail-edit';
import {cn} from '@tryghost/shade/utils';
import type {MemberEditableFields} from './member-detail-edit';

interface MemberDetailFormProps {
    draft: MemberEditableFields;
    emailError?: string | null;
    disabled?: boolean;
    onChange: (patch: Partial<MemberEditableFields>) => void;
    onEmailBlur?: () => void;
    // Fired when the name field loses focus. Callers use it to sync a
    // "committed identity" display state (e.g. the sidebar avatar) so it
    // doesn't churn on every keystroke.
    onNameBlur?: () => void;
}

const MemberDetailForm: React.FC<MemberDetailFormProps> = ({draft, emailError, disabled, onChange, onEmailBlur, onNameBlur}) => {
    // Soft limit: the note can be typed past 500 (Ember has no hard cap); the counter
    // just turns negative and red.
    const noteCharactersLeft = getNoteCharactersLeft(draft.note);
    const usedCharacters = NOTE_MAX_LENGTH - noteCharactersLeft;
    const overLimit = noteCharactersLeft < 0;
    // Traffic-light colour progression on the used-count digit as the note
    // fills up. Ember only had two states (green/red); this extends it with
    // a warning band as the user gets close to the limit so there's a visual
    // heads-up before they cross it. Thresholds are lenient by design — most
    // notes are short, and we don't want to nag on every keystroke.
    const usedColorClass = overLimit
        ? 'text-destructive'
        : usedCharacters >= NOTE_MAX_LENGTH * 0.8
            ? 'text-state-warning'
            : 'text-state-success';

    return (
        // `items-stretch` on the grid so both columns share the tallest child's
        // height. That lets the note-field column grow, and the textarea's
        // `flex-1` inside it fills whatever's left after the character counter,
        // so the textarea's bottom border lines up with the labels field's
        // bottom border in the left column.
        <div className='grid items-stretch gap-6 md:grid-cols-2' data-testid='member-detail-form'>
            <div className='flex flex-col gap-5'>
                <div className='flex flex-col gap-1.5'>
                    <Label htmlFor='member-name'>Name</Label>
                    <Input
                        disabled={disabled}
                        id='member-name'
                        value={draft.name}
                        onBlur={onNameBlur}
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
                        onBlur={onEmailBlur}
                        onChange={e => onChange({email: e.target.value})}
                    />
                    {emailError && <p className='text-sm text-destructive'>{emailError}</p>}
                </div>

                <div className='flex flex-col gap-1.5'>
                    <Label>Labels</Label>
                    <MemberLabelsField disabled={disabled} labels={draft.labels} onChange={nextLabels => onChange({labels: nextLabels})} />
                </div>
            </div>

            <div className='flex min-h-0 flex-col gap-1.5'>
                <Label htmlFor='member-note'>
                    Note <span className='font-normal text-muted-foreground'>(not visible to member)</span>
                </Label>
                {/* Shade's InputGroup gives us the shared inputSurface chrome
                    (border, radius, focus ring, invalid state) on the wrapper
                    and a borderless textarea inside. `InputGroupAddon` with
                    `align="block-end"` renders the counter as a proper footer
                    inside the border — the textarea's scrollbar (including
                    macOS's floating overlay style) stays visible above it. */}
                <InputGroup className='flex-1'>
                    <InputGroupTextarea
                        className='h-full'
                        disabled={disabled}
                        id='member-note'
                        value={draft.note}
                        onChange={e => onChange({note: e.target.value})}
                    />
                    <InputGroupAddon align='block-end' className='justify-end'>
                        <span className='text-sm text-muted-foreground'>
                            Maximum: <span className='font-semibold text-foreground'>{NOTE_MAX_LENGTH}</span> characters. You’ve used{' '}
                            <span className={cn('font-semibold', usedColorClass)}>{usedCharacters}</span>
                        </span>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
};

export default MemberDetailForm;
