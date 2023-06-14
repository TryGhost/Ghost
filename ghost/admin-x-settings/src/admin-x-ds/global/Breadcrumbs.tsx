import React from 'react';

export type BreadcrumbItem = {
    label: string;
    onClick?: () => void;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({items}) => {
    const allItems = items.length;
    let i = 0;

    return (
        <div className='flex items-center gap-2 text-sm'>
            {items.map((item) => {
                const bcItem = (i === allItems - 1 ?
                    <span className='font-bold'>{item.label}</span>
                    :
                    <>
                        <button
                            key={`bc-${i}`}
                            className={` text-sm ${item.onClick && '-mx-1 cursor-pointer rounded-sm px-1 py-px hover:bg-grey-100'}`}
                            type="button"
                            onClick={item.onClick}
                        >
                            {item.label}
                        </button>
                        <span>&rarr;</span>
                    </>);
                i = i + 1;
                return bcItem;
            })}
        </div>
    );
};

export default Breadcrumbs;