import {Button, LucideIcon, cn} from '@tryghost/shade';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {useEffect, useRef, useState} from 'react';

function ExpandButton({onClick, expanded}: {onClick: () => void; expanded: boolean}) {
    return (
        <Button
            className="shrink-0 gap-0.5 self-start p-0 text-base hover:bg-transparent"
            variant="ghost"
            onClick={onClick}
        >
            {expanded ? 'Show less' : 'Show more'}
            {expanded ? <LucideIcon.ChevronUp /> : <LucideIcon.ChevronDown />}
        </Button>
    );
}

function CommentContent({item}: {item: Comment}) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isClamped, setIsClamped] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Don't recalculate clamping while expanded, as the content won't be clamped
        // and we'd incorrectly hide the ExpandButton
        if (isExpanded) {
            return;
        }

        const checkIfClamped = () => {
            if (contentRef.current) {
                // Check if the content is clamped by comparing scrollHeight with clientHeight
                setIsClamped(contentRef.current.scrollHeight > contentRef.current.clientHeight);
            }
        };

        checkIfClamped();
        // Recheck on window resize only when collapsed
        window.addEventListener('resize', checkIfClamped);
        return () => window.removeEventListener('resize', checkIfClamped);
    }, [item.html, isExpanded]);

    return (
        <div className={`mt-1 flex flex-col gap-2`}>
            <div className={`flex max-w-full flex-col items-start ${item.status === 'hidden' && 'opacity-50'}`}>
                <div
                    dangerouslySetInnerHTML={{__html: item.html || ''}}
                    ref={contentRef}
                    className={cn(
                        'prose flex-1 text-base max-w-[80ch] balance leading-[1.5em] [&_*]:leading-[1.5em] [&_*]:text-base [&_*]:font-normal [&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground [&_blockquote]:p-0 [&_blockquote]:pl-3 [&_blockquote_p]:mt-0 [&_a]:underline',
                        (isExpanded ?
                            '-mb-1 [&_p]:mb-[0.85em]'
                            :
                            'line-clamp-2 [&_p]:m-0 [&_blockquote+p]:mt-1 mb-1')
                    )}
                />
                {isClamped && (
                    <ExpandButton expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} />
                )}
            </div>
        </div>
    );
}

export default CommentContent;
