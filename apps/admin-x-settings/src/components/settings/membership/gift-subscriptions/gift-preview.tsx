import PortalFrame from '../portal/portal-frame';
import React, {useEffect, useRef, useState} from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {getGiftPreviewUrl} from '../../../../utils/get-gift-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

// The gift page is a full-bleed, full-screen two-column layout. Rather than
// contain-scale a fixed design (which letterboxes with empty space whenever the
// preview pane's aspect ratio doesn't match), we render the page into a virtual
// desktop-width viewport whose HEIGHT tracks the pane's aspect, then scale it to
// fill the pane edge-to-edge — like a real browser window showing the page.
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
                // Fill the pane width at a real desktop width; never upscale past
                // 1:1 (which would blur). The virtual viewport height is derived
                // so that, once scaled, it fills the pane exactly — no letterbox.
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
        // self-stretch (not h-full) so the box gets a definite height from the
        // preview area's `items-center` flex wrapper; otherwise height:100%
        // doesn't resolve and the derived frame height feeds back on itself,
        // pushing the (vertically centred) page content out of view.
        <div ref={containerRef} className='w-full self-stretch overflow-hidden bg-white dark:bg-black'>
            {frame.scale > 0 && (
                <div
                    style={{
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
