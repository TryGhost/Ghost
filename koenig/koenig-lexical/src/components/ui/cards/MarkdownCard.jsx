import React from 'react';
import PropTypes from 'prop-types';
import useAutoExpandTextArea from '../../../utils/autoExpandTextArea';

export function MarkdownCard({value, onChange, isEditing}) {
    const textareaRef = React.useRef(null);

    useAutoExpandTextArea({el: textareaRef, value});

    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div>
            {isEditing
                ? (
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        className='min-h-170 w-full bg-grey-50 p-3 text-grey-900'
                        value={value}
                        onChange={handleChange}
                    />
                )
                : <div>{value}</div>
            }
        </div>
    );
}

MarkdownCard.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    isEditing: PropTypes.bool
};
