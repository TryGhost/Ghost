import React from 'react';
import {Form, TextArea, TextField} from '@tryghost/admin-x-design-system';

type NameDescriptionFieldsProps = {
    name: string;
    description: string;
    nameError?: string;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    clearNameError: () => void;
};

export const NameDescriptionFields: React.FC<NameDescriptionFieldsProps> = ({
    name,
    description,
    nameError,
    onNameChange,
    onDescriptionChange,
    clearNameError
}) => {
    return (
        <Form className='mt-6' gap='sm' margins='lg' title='Name and description'>
            <TextField
                error={Boolean(nameError)}
                hint={nameError}
                maxLength={191}
                placeholder="Weekly Roundup"
                title="Name"
                value={name}
                onChange={(event) => {
                    onNameChange(event.target.value);
                }}
                onKeyDown={clearNameError}
            />
            <TextArea
                maxLength={2000}
                rows={2}
                title="Description"
                value={description}
                onChange={(event) => {
                    onDescriptionChange(event.target.value);
                }}
            />
        </Form>
    );
};
