/**
 * NOTE: This component is very simplistic and will be significantly rewritten. See NY-1196.
 */

import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';

interface DripEmail {
    id: string;
    delayDays: number;
    subject: string;
}

let nextId = 0;
const makeId = () => {
    nextId += 1;
    return `drip-email-${nextId}`;
};

const DripEmailRow: React.FC<{
    email: DripEmail;
    onChange: (updated: DripEmail) => void;
    onRemove: () => void;
}> = ({email, onChange, onRemove}) => (
    <div className='flex items-center gap-2'>
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
        <div className='flex-1'>
            <TextField
                title='Subject'
                value={email.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange({...email, subject: e.target.value});
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
                        onChange([...emails, {id: makeId(), delayDays: 1, subject: ''}]);
                    }}
                />
            </div>
        </div>
    </div>
);

const DripSequences: React.FC<{keywords: string[]}> = ({keywords}) => {
    const [freeEmails, setFreeEmails] = useState<DripEmail[]>([]);
    const [paidEmails, setPaidEmails] = useState<DripEmail[]>([]);

    const handleSave = () => {
        // eslint-disable-next-line no-console
        console.log('Saving drip sequences (mock)', {freeEmails, paidEmails});
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
            <Button color='black' label='Save' onClick={handleSave} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DripSequences, 'Drip sequences');
