import {HighlightedString} from './HighlightedString';
import {InputListItem} from './InputList';

interface LinkInputSearchItemProps {
    dataTestId?: string;
    item: {
        value?: string | null;
        type?: string;
        Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        label: string;
        highlight?: boolean;
        metaText?: string;
        MetaIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        metaIconTitle?: string;
        [key: string]: unknown;
    };
    highlightString?: string;
    selected?: boolean;
    onMouseOver?: () => void;
    scrollIntoView?: boolean;
    onClick?: (item: {value?: string | null; type?: string}) => void;
}

export function LinkInputSearchItem({dataTestId, item, highlightString, selected, onMouseOver, scrollIntoView, onClick}: LinkInputSearchItemProps) {
    return (
        <InputListItem
            className='my-[.2rem] flex cursor-pointer items-center justify-between gap-3 rounded-md px-4 py-2 text-left text-black dark:text-white'
            dataTestId={dataTestId}
            item={item}
            scrollIntoView={scrollIntoView}
            selected={selected}
            selectedClassName='bg-grey-100 dark:bg-grey-900'
            onClick={onClick}
            onMouseOver={onMouseOver}
        >
            <span className="line-clamp-1 flex items-center gap-[.6rem]">
                {item.Icon && <item.Icon className="size-[1.4rem] stroke-[1.5px]" />}
                <span className="block truncate text-sm font-medium leading-snug" data-testid={`${dataTestId}-listOption-label`}><HighlightedString highlightString={highlightString} shouldHighlight={item.highlight} string={item.label} /></span>
            </span>
            {selected && (item.metaText || item.MetaIcon) && (
                <span className="flex shrink-0 items-center gap-[.6rem] text-[1.3rem] leading-snug tracking-tight text-grey-600 dark:text-grey-500" data-testid={`${dataTestId}-listOption-meta`}>
                    <span title={item.metaIconTitle}>{item.MetaIcon && <item.MetaIcon className="size-[1.4rem]" />}</span>
                    {item.metaText && <span>{item.metaText}</span>}
                </span>
            )}
        </InputListItem>
    );
}
