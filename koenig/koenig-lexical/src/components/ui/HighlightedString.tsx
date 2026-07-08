import escapeRegExp from 'lodash/escapeRegExp';

export function HighlightedString({string, highlightString, shouldHighlight = true}) {
    if (!highlightString || shouldHighlight === false) {
        return string;
    }

    const parts = string.split(new RegExp(`(${escapeRegExp(highlightString)})`, 'gi'));

    return (
        <>
            {parts.map((part, index) => {
                if (part.toLowerCase() === highlightString.toLowerCase()) {
                    // eslint-disable-next-line react/no-array-index-key
                    return <span key={index} className="font-bold">{part}</span>;
                }

                return part;
            })}
        </>
    );
}
