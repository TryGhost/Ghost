const CardText = ({text}) => {
    return (
        <span data-kg-card-drag-text className="text-sm font-sans font-bold text-grey-800 transition-all group-hover:text-grey-800">{text}</span>
    );
};

export function MediaPlaceholder({desc, Icon, filePicker, size, handleDrag, handleDrop, isDraggedOver, ...props}) {
    return (
        <div
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="border border-transparent" {...props}>
            <div className={`h-100 relative flex items-center justify-center border border-grey/20 bg-grey-50 ${size === 'xsmall' ? 'before:pb-[12.5%]' : 'before:pb-[62.5%]'}`}>
                {
                    isDraggedOver ?
                        <CardText text="Drop it like it's hot 🔥" />
                        :
                        <button onClick={filePicker} name="placeholder-button" className={`group flex cursor-pointer items-center justify-center ${size === 'xsmall' ? 'p-4' : 'p-20 flex-col'}`}>
                            <Icon className={`opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100 ${size === 'large' ? 'h-20 w-20 text-grey' : size === 'small' ? 'h-14 w-14 text-grey' : size === 'xsmall' ? 'w-6 h-6 mr-3 text-grey-700' : 'h-16 w-16 text-grey'}`} />
                            <p className={`font-sans text-sm font-normal text-grey-700 transition-all group-hover:text-grey-800 ${size === 'xsmall' ? '' : 'mt-4'}`}>{desc}</p>
                        </button>
                }
            </div>
        </div>
    );
}
