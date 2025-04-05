/* eslint-disable camelcase */
import GhostLogo from '../../../../assets/images/ghost-favicon.png';
import React, {useState} from 'react';

interface Props {
    title: string,
    favicon?: string | null,
    featured_image?: string | null,
    isGhostSite?: boolean,
}

const RecommendationIcon: React.FC<Props> = ({title, favicon, featured_image, isGhostSite}) => {
    const [icon, setIcon] = useState(favicon || featured_image || null);

    const clearIcon = () => {
        setIcon(null);
    };

    if (!icon) {
        return <div className="relative h-6 w-6 shrink-0 rounded-sm">
        </div>;
    }

    const hint = isGhostSite ? 'This is a Ghost site that supports one-click subscribe' : '';

    return (
        <div className="dark:group-hover/table-row:bg-grey-950 relative h-6 w-6 shrink-0 rounded-sm" title={hint}>
            <img alt={title} className="h-6 w-6 rounded-sm" src={icon} onError={clearIcon} />
            {isGhostSite && <img alt='Ghost Logo' className='absolute bottom-[-3px] right-[-3px] h-[14px] w-[14px]' src={GhostLogo} />}
        </div>
    );
};

export default RecommendationIcon;
