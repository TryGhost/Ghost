import React from 'react';
import {LucideIcon} from '@tryghost/shade';

interface SourceIconProps {
    displayName: string;
    iconSrc: string;
    defaultSourceIconUrl: string;
}

const SourceIcon: React.FC<SourceIconProps> = ({defaultSourceIconUrl, displayName, iconSrc}) => {
    // Don't render an icon if iconSrc is empty (e.g., for UTM campaign values)
    if (!iconSrc) {
        return null;
    }

    return (
        <>
            {displayName.trim().toLowerCase().endsWith('newsletter') ? (
                <LucideIcon.Mail aria-label="Newsletter" className="size-4 text-muted-foreground" />
            ) : (
                <img
                    alt=""
                    className="size-4"
                    src={iconSrc}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = defaultSourceIconUrl;
                    }}
                />
            )}
        </>
    );
};

export default SourceIcon;
