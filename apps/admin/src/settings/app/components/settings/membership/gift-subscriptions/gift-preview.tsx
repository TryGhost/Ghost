import PortalFrame from '@/settings/app/components/settings/membership/portal/portal-frame';
import React, {useEffect, useRef, useState} from 'react';
import {Box} from '@tryghost/shade/primitives';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {getGiftPreviewUrl} from '@/settings/app/utils/get-gift-preview-url';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';

const DESIGN_WIDTH = 1280;

interface GiftPreviewProps {
    localSettings: Setting[];
    localTiers?: Tier[];
}

const GiftPreview: React.FC<GiftPreviewProps> = ({localSettings, localTiers}) => {
    const {siteData, config} = useGlobalData();
    const containerRef = useRef<HTMLDivElement>(null);
    const [frame, setFrame] = useState({scale: 0, width: 0, height: 0});
    const href = getGiftPreviewUrl({
        settings: localSettings,
        tiers: localTiers,
        config,
        siteData
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const updateFrame = () => {
            const {width, height} = container.getBoundingClientRect();
            if (width && height) {
                const scale = Math.min(width / DESIGN_WIDTH, 1);
                setFrame({scale, width: width / scale, height: height / scale});
            }
        };

        updateFrame();
        const observer = new ResizeObserver(updateFrame);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    return (
        <Box className='flex size-full bg-gradient-to-tr from-preview-gradient-start to-preview-gradient-end p-8'>
            <div ref={containerRef} className='relative w-full overflow-hidden rounded-lg bg-surface-elevated shadow-sm'>
                {frame.scale > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: frame.width,
                            height: frame.height,
                            transform: `scale(${frame.scale})`,
                            transformOrigin: 'top left'
                        }}
                    >
                        <PortalFrame href={href || ''} portalParent='gift-preview' />
                    </div>
                )}
            </div>
        </Box>
    );
};

export default GiftPreview;
