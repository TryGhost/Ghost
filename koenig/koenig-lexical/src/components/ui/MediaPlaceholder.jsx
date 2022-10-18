export function MediaPlaceholder({desc, Icon, ...props}) {
    return (
        <div className="cursor-pointer border border-transparent" {...props}>
            <div className="h-100 relative flex items-center justify-center border border-grey-100 bg-grey-50 before:pb-[62.5%]">
                <button name="placeholder-button" className="group flex flex-col items-center justify-center p-20">
                    <Icon className="h-32 w-32 opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100" />
                    <p className="mt-4 font-sans text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                </button>
            </div>
        </div>
    );
}
