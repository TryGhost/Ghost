import DownloadIcon from '../../../../assets/icons/kg-download.svg?react';
import React from 'react';
import UnsplashHeartIcon from '../../../../assets/icons/kg-unsplash-heart.svg?react';

const BUTTON_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
    heart: UnsplashHeartIcon,
    download: DownloadIcon
};

interface UnsplashButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    icon?: string;
    label?: string | number;
}

function UnsplashButton({icon, label, ...props}: UnsplashButtonProps) {
    const Icon = icon ? BUTTON_ICONS[icon] : null;

    return (
        <a className="flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-white px-3 py-2 font-sans text-sm font-medium leading-6 text-grey-700 opacity-90 transition-all ease-in-out first-of-type:mr-3 hover:opacity-100"
            onClick={e => e.stopPropagation()}
            {...props}
        >
            {Icon && <Icon className={`size-4 fill-red stroke-[3px] ${label ? 'mr-1' : ''}`} />}
            {label && <span>{label}</span>}
        </a>
    );
}

export default UnsplashButton;
