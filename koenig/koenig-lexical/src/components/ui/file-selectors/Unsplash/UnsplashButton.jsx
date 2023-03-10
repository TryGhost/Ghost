import {ReactComponent as DownloadIcon} from '../../../../assets/icons/kg-download.svg';
import {ReactComponent as UnsplashHeartIcon} from '../../../../assets/icons/kg-unsplash-heart.svg';

const BUTTON_ICONS = {
    heart: UnsplashHeartIcon,
    download: DownloadIcon
};

function UnsplashButton({icon, label, ...props}) {
    const Icon = BUTTON_ICONS[icon];

    return (
        <a onClick={e => e.stopPropagation()}
            type="button" 
            className="flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-white py-2 px-3 font-sans text-sm font-medium leading-6 text-grey-700 opacity-90 transition-all ease-in-out first-of-type:mr-3 hover:opacity-100" 
            {...props}
        >
            {icon && <Icon className={`h-4 w-4 fill-red stroke-[3px] ${label && 'mr-1'}`} />}
            {label && <span>{label}</span>}
        </a>
    );
}

export default UnsplashButton;
