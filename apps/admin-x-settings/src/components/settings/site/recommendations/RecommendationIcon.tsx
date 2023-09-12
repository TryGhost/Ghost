/* eslint-disable camelcase */
import React, {useState} from 'react';

interface Props {
    title: string,
    favicon?: string | null,
    featured_image?: string | null
}

const RecommendationIcon: React.FC<Props> = ({title, favicon, featured_image}) => {
    const [icon, setIcon] = useState(favicon || featured_image || null);

    const clearIcon = () => {
        setIcon(null);
    };

    if (!icon) {
        return null;
    }

    return (<img alt={title} className="h-5 w-5 rounded-sm" src={icon} onError={clearIcon} />);
};

export default RecommendationIcon;
