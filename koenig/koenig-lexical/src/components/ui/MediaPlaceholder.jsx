export function MediaPlaceholder({desc, Icon, filePicker, type, ...props}) {
    return (
        <div className="border border-transparent" {...props}>
            <div className="h-100 relative flex items-center justify-center border border-grey-100 bg-grey-50 before:pb-[62.5%]">
                <button onClick={filePicker} name="placeholder-button" className="group flex cursor-pointer flex-col items-center justify-center p-20">
                    <Icon className={`opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100 text-grey ${type === 'gallery' ? 'h-20 w-20' : 'h-16 w-16'}`} />
                    <p className="mt-4 font-sans text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                </button>
            </div>
        </div>
    );
}
