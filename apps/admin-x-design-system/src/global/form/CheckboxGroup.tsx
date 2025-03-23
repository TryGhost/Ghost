import React from 'react';
import Heading from '../Heading';
import Hint from '../Hint';
import Checkbox, {CheckboxProps} from './Checkbox';

export interface CheckboxGroupProps {
    title?: string;
    checkboxes?: CheckboxProps[];
    hint?: string;
    error?: boolean;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
    title,
    checkboxes,
    hint,
    error
}) => {
    return (
        <div>
            {title && <Heading grey={true} level={6}>{title}</Heading>}
            <div className='mt-2 flex flex-col gap-1'>
                {checkboxes?.map(({key, ...props}) => (
                    <Checkbox key={key} {...props} />
                ))}
            </div>
            <div className={`flex flex-col ${hint && 'mb-2'}`}>
                {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
            </div>
        </div>
    );
};

export default CheckboxGroup;
