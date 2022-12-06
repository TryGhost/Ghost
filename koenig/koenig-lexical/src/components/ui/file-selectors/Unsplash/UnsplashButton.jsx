import {ReactComponent as UnsplashHeartIcon} from '../../../../assets/icons/kg-unsplash-heart.svg';
import {ReactComponent as DownloadIcon} from '../../../../assets/icons/kg-download.svg';

const BUTTON_ICONS = {
    heart: UnsplashHeartIcon,
    download: DownloadIcon
};

function UnsplashButton({icon, label, ...props}) {
    const Icon = BUTTON_ICONS[icon];

    return (
        <a onClick={e => e.stopPropagation()}
            type="button" 
            className="flex items-center shrink-0 h-8 py-2 px-3 font-sans text-sm text-grey-700 font-medium leading-6 bg-white rounded-md opacity-90 transition-all ease-in-out hover:opacity-100 first-of-type:mr-3 cursor-pointer" 
            {...props}
        >
            {icon && <Icon className={`w-4 h-4 fill-red stroke-[3px] ${label && 'mr-1'}`} />}
            {label && <span>{label}</span>}
        </a>
    );
}

export default UnsplashButton;
