import {ReactComponent as BoldIcon} from '../../assets/icons/kg-bold.svg';
import {ReactComponent as ItalicIcon} from '../../assets/icons/kg-italic.svg';
import {ReactComponent as HeadingOneIcon} from '../../assets/icons/kg-heading-1.svg';
import {ReactComponent as HeadingTwoIcon} from '../../assets/icons/kg-heading-2.svg';
import {ReactComponent as QuoteIcon} from '../../assets/icons/kg-quote.svg';
import {ReactComponent as QuoteOneIcon} from '../../assets/icons/kg-quote-1.svg';
import {ReactComponent as QuoteTwoIcon} from '../../assets/icons/kg-quote-2.svg';
import {ReactComponent as LinkIcon} from '../../assets/icons/kg-link.svg';
import {ReactComponent as ImageRegular} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWide} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImageFull} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImageReplace} from '../../assets/icons/kg-replace.svg';
import {ReactComponent as SnippetIcon} from '../../assets/icons/kg-snippet.svg';

export const TOOLBAR_ICONS = {
    bold: BoldIcon,
    italic: ItalicIcon,
    headingOne: HeadingOneIcon,
    headingTwo: HeadingTwoIcon,
    quote: QuoteIcon,
    quoteOne: QuoteOneIcon,
    quoteTwo: QuoteTwoIcon,
    link: LinkIcon,
    imageRegular: ImageRegular,
    imageWide: ImageWide,
    imageFull: ImageFull,
    imageReplace: ImageReplace,
    snippet: SnippetIcon
};

export function ToolbarMenu({children, ...props}) {
    return (
        <ul className="m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white" {...props}>
            {children}
        </ul>
    );
}

export function ToolbarMenuItem({label, isActive, onClick, icon, ...props}) {
    const Icon = TOOLBAR_ICONS[icon];

    return (
        <li className="m-0 flex p-0 first:m-0" {...props}>
            <button
                type="button"
                className="flex h-9 w-9 items-center justify-center"
                onClick={onClick}
                aria-label={label}
                data-kg-active={isActive}
            >
                <Icon className={isActive ? 'fill-green' : 'fill-white'} />
            </button>
        </li>
    );
}

export function ToolbarMenuSeparator() {
    return (
        <li className="m-0 mx-1 h-5 w-px bg-grey-900"></li>
    );
}
