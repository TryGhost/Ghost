import PortalFrame from '../portal/portal-frame';
import React, {useEffect, useRef, useState} from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {getGiftPreviewUrl} from '../../../../utils/get-gift-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

// The gift page is a full-bleed, full-screen two-column layout — it can't be
// crammed into the narrow modal preview pane without cropping the branded card.
// Instead we render it at a real desktop size and contain-scale the whole thing
// down to fit the pane, so the full page shows proportionally.
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 832;

interface GiftPreviewProps {
    localSettings: Setting[];
}

const GiftPreview: React.FC<GiftPreviewProps> = ({localSettings}) => {
    const {siteData, config} = useGlobalData();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);

    const href = getGiftPreviewUrl({
        settings: localSettings,
        config,
        siteData
    });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return;
        }
        const update = () => {
            const {width, height} = el.getBoundingClientRect();
            if (width && height) {
                // Contain: fit within the pane on both axes, never upscale
                setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT, 1));
            }
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className='flex size-full items-center justify-center overflow-hidden'
        >
            {scale > 0 && (
                <div
                    style={{
                        width: DESIGN_WIDTH,
                        height: DESIGN_HEIGHT,
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        flexShrink: 0,
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 1px 20px rgba(0,0,0,0.09)'
                    }}
                >
                    <PortalFrame href={href || ''} portalParent='preview' />
                </div>
            )}
        </div>
    );
};

export default GiftPreview;
