/* eslint-disable camelcase */
import GhostLogo from '../../../../assets/images/ghost-favicon.png';
import React, {useState} from 'react';

interface Props {
    title: string,
    favicon?: string | null,
    showSubscribes?: number | boolean,
    featured_image?: string | null
}

const RecommendationIcon: React.FC<Props> = ({title, favicon, showSubscribes, featured_image}) => {
    const [icon, setIcon] = useState(favicon || featured_image || null);

    const clearIcon = () => {
        setIcon(null);
    };

    if (!icon) {
        return null;
    }

    const hint = showSubscribes ? 'This is a Ghost site that supports one-click subscribe' : '';

    return (
        <div className="relative h-5 w-5" title={hint}>
            <img alt={title} className="h-5 w-5 rounded-sm" src={icon} onError={clearIcon} />
            {showSubscribes && <img alt='Ghost Logo' className='absolute bottom-[-3px] right-[-3px] h-[14px] w-[14px]' src={GhostLogo} />}
        </div>
    );
};

export default RecommendationIcon;
