import React from 'react';
import PropTypes from 'prop-types';
import useAutoExpandTextArea from '../../../utils/autoExpandTextArea';

export function CodeBlockCard({code, language, updateCode, updateLanguage}) {
    const textareaRef = React.useRef(null);

    useAutoExpandTextArea({el: textareaRef, value: code});

    return (
        <code>
            <textarea
                ref={textareaRef}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                tabIndex="0"
                autoFocus
                className='min-h-170 w-full bg-grey-50 p-3 text-grey-900'
                value={code}
                onChange={updateCode}
            />
        </code>
    );
}

CodeBlockCard.propTypes = {
    code: PropTypes.string
};