import escapeRegExp from 'lodash/escapeRegExp';

interface HighlightedStringProps {
    string: string;
    highlightString?: string;
    shouldHighlight?: boolean;
}

export function HighlightedString({string, highlightString, shouldHighlight = true}: HighlightedStringProps) {
    if (!highlightString || shouldHighlight === false) {
        return string;
    }

    const parts = string.split(new RegExp(`(${escapeRegExp(highlightString)})`, 'gi'));

    // track each part's starting character offset to use as a stable, unique key
    let offset = 0;

    return (
        <>
            {parts.map((part) => {
                const partOffset = offset;
                offset += part.length;

                if (part.toLowerCase() === highlightString.toLowerCase()) {
                    return <span key={partOffset} className="font-bold">{part}</span>;
                }

                return part;
            })}
        </>
    );
}
