import PortalFrame from '../portal/portal-frame';
import React, {useEffect, useRef, useState} from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {getGiftPreviewUrl} from '../../../../utils/get-gift-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

// The gift page is a full-bleed, full-screen two-column layout. We render it into
// a virtual desktop-width viewport whose height tracks the preview pane's aspect,
// then scale it to fill the pane edge-to-edge (never upscaling past 1:1).
//
// The scaled frame is positioned ABSOLUTELY so it can't inflate the container we
// measure against. The preview area (deviceSelector=false → a `flex grow
// items-center` wrapper, no DesktopChrome) gives the container a real height only
// when nothing in-flow forces it taller; an in-flow fixed/derived height fed back
// on the measurement and pushed the page's content out of view.
const DESIGN_WIDTH = 1280;

interface GiftPreviewProps {
    localSettings: Setting[];
}

const GiftPreview: React.FC<GiftPreviewProps> = ({localSettings}) => {
    const {siteData, config} = useGlobalData();
    const containerRef = useRef<HTMLDivElement>(null);
    const [frame, setFrame] = useState({scale: 0, width: 0, height: 0});

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
                const scale = Math.min(width / DESIGN_WIDTH, 1);
                setFrame({scale, width: width / scale, height: height / scale});
            }
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className='relative size-full overflow-hidden bg-white dark:bg-black'>
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
                    <PortalFrame href={href || ''} portalParent='preview' />
                </div>
            )}
        </div>
    );
};

export default GiftPreview;
