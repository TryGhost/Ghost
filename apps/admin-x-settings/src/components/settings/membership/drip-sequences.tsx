/**
 * NOTE: This component is very simplistic and will be significantly rewritten. See NY-1196.
 */

import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, TextField, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useBrowseDripSequence, useEditDripSequence} from '@tryghost/admin-x-framework/api/drip-sequences';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {DripSequencesResponseType} from '@tryghost/admin-x-framework/api/drip-sequences';

interface DripEmail {
    id: string; // local row id
    apiId?: string;
    delayDays: number;
    subject: string;
    body: string;
}

const FREE_SEQUENCE_SLUG = 'member-welcome-email-free';
const PAID_SEQUENCE_SLUG = 'member-welcome-email-paid';

let nextId = 0;
const makeId = () => {
    nextId += 1;
    return `drip-email-${nextId}`;
};

const toLexical = (body: string) => JSON.stringify({
    root: {
        children: [{
            children: body.trim() ? [{
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: body.trim(),
                type: 'extended-text',
                version: 1
            }] : [],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
        }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

const fromLexical = (lexical: string | null | undefined) => {
    if (!lexical) {
        return '';
    }

    try {
        const parsed = JSON.parse(lexical);
        const firstParagraph = parsed?.root?.children?.find((child: {type?: string}) => child.type === 'paragraph');
        if (!firstParagraph || !Array.isArray(firstParagraph.children)) {
            return '';
        }

        return firstParagraph.children
            .map((child: {text?: string}) => child.text || '')
            .join('');
    } catch {
        return '';
    }
};

const DripEmailRow: React.FC<{
    email: DripEmail;
    onChange: (updated: DripEmail) => void;
    onRemove: () => void;
}> = ({email, onChange, onRemove}) => (
    <div className='flex items-end gap-2'>
        <div className='w-24'>
            <TextField
                title='Delay (days)'
                type='number'
                value={`${email.delayDays}`}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange({...email, delayDays: Number.parseInt(e.target.value) || 0});
                }}
            />
        </div>
        <div className='w-64'>
            <TextField
                title='Subject'
                value={email.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange({...email, subject: e.target.value});
                }}
            />
        </div>
        <div className='flex-1'>
            <TextField
                title='Body'
                value={email.body}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange({...email, body: e.target.value});
                }}
            />
        </div>
        <Button color='red' label='Remove' link onClick={onRemove} />
    </div>
);

const SequenceEditor: React.FC<{
    title: string;
    emails: DripEmail[];
    onChange: (emails: DripEmail[]) => void;
}> = ({title, emails, onChange}) => (
    <div className='mb-6'>
        <Heading level={6}>{title}</Heading>
        <div className='mt-2 flex flex-col gap-4'>
            {emails.map((email, idx) => (
                <DripEmailRow
                    key={email.id}
                    email={email}
                    onChange={(updated) => {
                        const next = [...emails];
                        next[idx] = updated;
                        onChange(next);
                    }}
                    onRemove={() => {
                        onChange(emails.filter((_, i) => i !== idx));
                    }}
                />
            ))}
            <div>
                <Button
                    color='green'
                    label='Add email'
                    link
                    onClick={() => {
                        onChange([...emails, {id: makeId(), delayDays: 1, subject: '', body: ''}]);
                    }}
                />
            </div>
        </div>
    </div>
);

const mapResponseEmails = (response: DripSequencesResponseType | undefined) => {
    const sequence = response?.drip_sequences?.[0];
    if (!sequence) {
        return [];
    }

    return sequence.emails.map((email) => {
        return {
            id: email.id,
            apiId: email.id,
            delayDays: email.delay_days,
            subject: email.subject,
            body: fromLexical(email.lexical)
        };
    });
};

const DripSequences: React.FC<{keywords: string[]}> = ({keywords}) => {
    const handleError = useHandleError();
    const [freeEmails, setFreeEmails] = useState<DripEmail[]>([]);
    const [paidEmails, setPaidEmails] = useState<DripEmail[]>([]);
    const {data: freeSequenceData} = useBrowseDripSequence(FREE_SEQUENCE_SLUG);
    const {data: paidSequenceData} = useBrowseDripSequence(PAID_SEQUENCE_SLUG);
    const {mutateAsync: editDripSequence, isLoading: isSaving} = useEditDripSequence();

    useEffect(() => {
        setFreeEmails(mapResponseEmails(freeSequenceData));
    }, [freeSequenceData]);

    useEffect(() => {
        setPaidEmails(mapResponseEmails(paidSequenceData));
    }, [paidSequenceData]);

    const serializeEmails = (emails: DripEmail[]) => {
        return emails.map((email) => {
            return {
                ...(email.apiId ? {id: email.apiId} : {}),
                subject: email.subject,
                lexical: toLexical(email.body),
                delay_days: email.delayDays
            };
        });
    };

    const handleSave = async () => {
        try {
            await Promise.all([
                editDripSequence({
                    automationSlug: FREE_SEQUENCE_SLUG,
                    emails: serializeEmails(freeEmails)
                }),
                editDripSequence({
                    automationSlug: PAID_SEQUENCE_SLUG,
                    emails: serializeEmails(paidEmails)
                })
            ]);
            showToast({
                type: 'success',
                title: 'Drip sequences saved'
            });
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <TopLevelGroup
            keywords={keywords}
            navid='drip-sequences'
            testId='drip-sequences'
            title='Drip sequences'
        >
            <SequenceEditor emails={freeEmails} title='Free drip sequence' onChange={setFreeEmails} />
            <SequenceEditor emails={paidEmails} title='Paid drip sequence' onChange={setPaidEmails} />
            <Button color='black' disabled={isSaving} label='Save' onClick={handleSave} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DripSequences, 'Drip sequences');
