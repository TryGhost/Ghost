export const CardMenuSection = ({label, children, ...props}) => {
    return (
        <li role="separator" className="flex shrink-0 flex-col justify-center text-[1.1rem] font-semibold uppercase tracking-wide text-grey" {...props}>
            <span className="mb-2 block px-4 pt-3" style={{minWidth: 'calc(100% - 3.2rem)'}}>{label}</span>
            <ul role="menu">
                {children}
            </ul>
        </li>
    );
};

export const CardMenuItem = ({label, desc, onClick, Icon, ...props}) => {
    return (
        <li role="presentation">
            <button type="button" role="menuitem" className="flex w-full cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-left text-grey-800 hover:bg-grey-100" onClick={onClick} data-kg-card-menu-item={label} {...props}>
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-normal leading-[1.6rem] tracking-[.02rem] text-grey-900">{label}</div>
                    <div className="m-0 ml-4 truncate text-xs font-normal leading-[1.6rem] tracking-[.02rem] text-grey">{desc}</div>
                </div>
            </button>
        </li>
    );
};

export const CardSnippetItem = ({label, Icon, ...props}) => {
    return (
        <li role="presentation">
            <button type="button" role="menuitem" className="flex cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-grey-800 hover:bg-grey-100" {...props}>
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-normal leading-[1.6rem] tracking-[.02rem] text-grey-900">{label}</div>
                </div>
            </button>
        </li>
    );
};

export const CardMenu = ({children}) => {
    return (
        <ul role="menu" className="not-kg-prose z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 pt-0 font-sans text-sm shadow after:block after:pb-4">
            {children}
        </ul>
    );
};
