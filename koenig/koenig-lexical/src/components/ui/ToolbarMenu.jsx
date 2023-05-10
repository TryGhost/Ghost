import {ReactComponent as AddIcon} from '../../assets/icons/kg-add.svg';
import {ReactComponent as BoldIcon} from '../../assets/icons/kg-bold.svg';
import {ReactComponent as EditIcon} from '../../assets/icons/kg-edit.svg';
import {ReactComponent as HeadingOneIcon} from '../../assets/icons/kg-heading-1.svg';
import {ReactComponent as HeadingTwoIcon} from '../../assets/icons/kg-heading-2.svg';
import {ReactComponent as ImgFullIcon} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgReplaceIcon} from '../../assets/icons/kg-replace.svg';
import {ReactComponent as ImgWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ItalicIcon} from '../../assets/icons/kg-italic.svg';
import {ReactComponent as LinkIcon} from '../../assets/icons/kg-link.svg';
import {ReactComponent as QuoteIcon} from '../../assets/icons/kg-quote.svg';
import {ReactComponent as QuoteOneIcon} from '../../assets/icons/kg-quote-1.svg';
import {ReactComponent as QuoteTwoIcon} from '../../assets/icons/kg-quote-2.svg';
import {ReactComponent as SnippetIcon} from '../../assets/icons/kg-snippet.svg';
import {ReactComponent as TrashIcon} from '../../assets/icons/kg-trash.svg';

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
        <ul className="relative m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white dark:bg-grey-950" {...props}>
            {children}

            {/* Arrow block. Used div instead of pseudo-element. Arrow requires dynamic values for position,
             and Tailwind can't handle this. They recommended CSS-in-JS or style attr for such cases (https://v2.tailwindcss.com/docs/just-in-time-mode) */}
            <li
                className="absolute top-[36px] left-[calc(50%-8px)] w-0 border-x-8 border-t-8 border-x-transparent border-t-black dark:border-t-grey-950"
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
                className="flex h-9 w-9 cursor-pointer items-center justify-center transition-opacity hover:opacity-75"
                data-kg-active={isActive}
                data-testid={dataTestId}
                type="button"
                onClick={onClick}
            >
                <Icon className={` h-4 w-4 ${isActive ? 'fill-green' : 'fill-white'} `} />
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
