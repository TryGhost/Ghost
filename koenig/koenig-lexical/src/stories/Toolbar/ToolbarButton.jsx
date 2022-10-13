import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as BoldIcon} from '../../assets/icons/kg-bold.svg';
import {ReactComponent as ItalicIcon} from '../../assets/icons/kg-italic.svg';
import {ReactComponent as HeadingOneIcon} from '../../assets/icons/kg-heading-1.svg';
import {ReactComponent as HeadingTwoIcon} from '../../assets/icons/kg-heading-2.svg';
import {ReactComponent as LinkIcon} from '../../assets/icons/kg-link.svg';
import {ReactComponent as QuoteIcon} from '../../assets/icons/kg-quote.svg';
import {ReactComponent as ImgRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImgFullIcon} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as ReplaceIcon} from '../../assets/icons/kg-replace.svg';
import {ReactComponent as AddIcon} from '../../assets/icons/kg-add.svg';
import {ReactComponent as SnippetIcon} from '../../assets/icons/kg-snippet.svg';

const Icons = {
    bold: BoldIcon,
    italic: ItalicIcon,
    headingOne: HeadingOneIcon,
    headingTwo: HeadingTwoIcon,
    link: LinkIcon,
    quote: QuoteIcon,
    imgRegular: ImgRegularIcon,
    imgWide: ImgWideIcon,
    imgFull: ImgFullIcon,
    replace: ReplaceIcon,
    add: AddIcon,
    snippet: SnippetIcon
};

export const ToolbarButton = ({icon, ...props}) => {
    const [isActive, setActive] = React.useState(false);

    return (
        <li className="m-0 flex p-0 first:m-0">
            <div
                type="button"
                className="flex h-9 w-9 items-center justify-center"
                onClick={() => setActive(!isActive)}
                {...props}
            >
                <span>
                    {icon && <ButtonIcon name={icon} isActive={isActive} />}
                </span>
            </div> 
        </li>
    );
};

ToolbarButton.propTypes = {
    icon: PropTypes.string
};

const ButtonIcon = ({name, isActive}) => {
    if (Icons[name] === undefined) {
        return null;
    }
    const Icon = Icons[name];
    return (
        <span>
            <Icon className={`${isActive ? 'fill-green' : 'fill-white'}`} />
        </span>
    );
};

ButtonIcon.propTypes = {
    name: PropTypes.string.isRequired,
    isActive: PropTypes.bool
};