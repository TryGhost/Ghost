export function EditorPlaceholder({className, text}) {
    return (
        <div
            className={`pointer-events-none absolute top-0 left-0 min-w-full cursor-text font-serif text-xl text-grey-500 ${className}`}
        >{text || 'Begin writing your post...'}</div>
    );
}
