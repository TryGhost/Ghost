import MemberLabelsField from './member-labels-field';
import React from 'react';
import {Input, Label, Textarea} from '@tryghost/shade/components';
import {NOTE_MAX_LENGTH, getNoteCharactersLeft} from './member-detail-edit';
import {cn} from '@tryghost/shade/utils';
import type {MemberEditableFields} from './member-detail-edit';

interface MemberDetailFormProps {
    draft: MemberEditableFields;
    emailError?: string | null;
    disabled?: boolean;
    onChange: (patch: Partial<MemberEditableFields>) => void;
}

const MemberDetailForm: React.FC<MemberDetailFormProps> = ({draft, emailError, disabled, onChange}) => {
    // Soft limit: the note can be typed past 500 (Ember has no hard cap); the counter
    // just turns negative and red.
    const noteCharactersLeft = getNoteCharactersLeft(draft.note);
    const usedCharacters = NOTE_MAX_LENGTH - noteCharactersLeft;
    const overLimit = noteCharactersLeft < 0;

    return (
        <div className='flex flex-col gap-5' data-testid='member-detail-form'>
            <div className='grid gap-4 md:grid-cols-2'>
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
            </div>

            <div className='flex flex-col gap-1.5'>
                <Label>Labels</Label>
                <MemberLabelsField disabled={disabled} labels={draft.labels} onChange={nextLabels => onChange({labels: nextLabels})} />
            </div>

            <div className='flex flex-col gap-1.5'>
                <Label htmlFor='member-note'>
                    Note <span className='font-normal text-muted-foreground'>(not visible to member)</span>
                </Label>
                <Textarea
                    disabled={disabled}
                    id='member-note'
                    value={draft.note}
                    onChange={e => onChange({note: e.target.value})}
                />
                <p className={cn('text-sm text-muted-foreground', overLimit && 'text-destructive')}>
                    Maximum: <span className='font-semibold text-foreground'>{NOTE_MAX_LENGTH}</span> characters. You’ve used{' '}
                    <span className={cn('font-semibold text-foreground', overLimit && 'text-destructive')}>{usedCharacters}</span>
                </p>
            </div>
        </div>
    );
};

export default MemberDetailForm;
