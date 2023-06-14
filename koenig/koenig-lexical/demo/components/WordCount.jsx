const WordCount = ({wordCount}) => {
    return (
        <div className="absolute top-4 left-6 z-20 block cursor-pointer rounded bg-white py-1 px-2 font-mono text-sm tracking-tight text-grey-600 dark:bg-transparent">
            <span data-testid="word-count">{wordCount}</span> words
        </div>
    );
};

export default WordCount;
