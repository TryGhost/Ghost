import AddIcon from '../../assets/icons/kg-add.svg?react';
import BoldIcon from '../../assets/icons/kg-bold.svg?react';
import EditIcon from '../../assets/icons/kg-edit.svg?react';
import HeadingOneIcon from '../../assets/icons/kg-heading-1.svg?react';
import HeadingTwoIcon from '../../assets/icons/kg-heading-2.svg?react';
import ImgFullIcon from '../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../assets/icons/kg-img-regular.svg?react';
import ImgReplaceIcon from '../../assets/icons/kg-replace.svg?react';
import ImgWideIcon from '../../assets/icons/kg-img-wide.svg?react';
import ItalicIcon from '../../assets/icons/kg-italic.svg?react';
import LinkIcon from '../../assets/icons/kg-link.svg?react';
import QuoteIcon from '../../assets/icons/kg-quote.svg?react';
import QuoteOneIcon from '../../assets/icons/kg-quote-1.svg?react';
import QuoteTwoIcon from '../../assets/icons/kg-quote-2.svg?react';
import SnippetIcon from '../../assets/icons/kg-snippet.svg?react';
import TrashIcon from '../../assets/icons/kg-trash.svg?react';

export const TOOLBAR_ICONS = {
    bold: BoldIcon,
    italic: ItalicIcon,
    headingOne: HeadingOneIcon,
    headingTwo: HeadingTwoIcon,
    quote: QuoteIcon,
    quoteOne: QuoteOneIcon,
    quoteTwo: QuoteTwoIcon,
    link: LinkIcon,
    imgRegular: ImgRegularIcon,
    imgWide: ImgWideIcon,
    imgFull: ImgFullIcon,
    imgReplace: ImgReplaceIcon,
    add: AddIcon,
    edit: EditIcon,
    snippet: SnippetIcon,
    remove: TrashIcon
};

export function ToolbarMenu({children, hide, arrowStyles, ...props}) {
    if (hide) {
        return null;
    }

    return (
        <ul className="relative m-0 flex items-center justify-evenly rounded-lg bg-black px-1 py-0 font-sans text-md font-normal text-white dark:bg-grey-950" {...props}>
            {children}

            {/* Arrow block. Used div instead of pseudo-element. Arrow requires dynamic values for position,
             and Tailwind can't handle this. They recommended CSS-in-JS or style attr for such cases (https://v2.tailwindcss.com/docs/just-in-time-mode) */}
            <li
                className="absolute left-[calc(50%-8px)] top-[36px] w-0 border-x-8 border-t-8 border-x-transparent border-t-black dark:border-t-grey-950"
                style={arrowStyles}
            ></li>
        </ul>
    );
}

export function ToolbarMenuItem({label, isActive, onClick, icon, dataTestId, hide, ...props}) {
    if (hide) {
        return null;
    }

    const Icon = TOOLBAR_ICONS[icon];

    return (
        <li className="m-0 flex p-0 first:m-0" {...props}>
            <button
                aria-label={label}
                className="flex size-9 cursor-pointer items-center justify-center transition-opacity hover:opacity-75"
                data-kg-active={isActive}
                data-testid={dataTestId}
                title={label}
                type="button"
                onClick={onClick}
            >
                <Icon className={` size-4 ${isActive ? 'fill-green' : 'fill-white'} `} />
            </button>
        </li>
    );
}

export function ToolbarMenuSeparator({hide}) {
    if (hide) {
        return null;
    }

    return (
        <li className="m-0 mx-1 h-5 w-px bg-grey-900"></li>
    );
}
