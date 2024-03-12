import DownloadIcon from '../assets/kg-download.svg?react';
import React, {HTMLProps} from 'react';
import UnsplashHeartIcon from '../assets/kg-unsplash-heart.svg?react';

// Define the available icon types
type ButtonIconType = 'heart' | 'download';

// Define the props type
interface UnsplashButtonProps extends HTMLProps<HTMLAnchorElement> {
    icon?: ButtonIconType;
    label?: string;
}

const BUTTON_ICONS: Record<ButtonIconType, React.ComponentType<Partial<React.SVGProps<SVGSVGElement>>>> = {
    heart: UnsplashHeartIcon,
    download: DownloadIcon
};

const UnsplashButton: React.FC<UnsplashButtonProps> = ({icon, label, ...props}) => {
    let Icon = null;
    if (icon) {
        Icon = BUTTON_ICONS[icon];
    }

    return (
        <a
            className="text-grey-700 flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-white px-3 py-2 font-sans text-sm font-medium leading-6 opacity-90 transition-all ease-in-out hover:opacity-100"
            onClick={e => e.stopPropagation()}
            {...props}
        >
            {icon && Icon && <Icon className={`size-4 ${icon === 'heart' ? 'fill-red' : ''} stroke-[3px] ${label && 'mr-1'}`} />}
            {label && <span>{label}</span>}
        </a>
    );
};

export default UnsplashButton;
