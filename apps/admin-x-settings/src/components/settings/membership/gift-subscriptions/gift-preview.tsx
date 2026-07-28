import PortalFrame from '../portal/portal-frame';
import React, {useEffect, useRef, useState} from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {getGiftPreviewUrl} from '../../../../utils/get-gift-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

// The gift page is a full-bleed, full-screen two-column layout. We render it into
// a virtual desktop-width viewport whose height tracks the preview pane's aspect,
// then scale it to fill the pane edge-to-edge (never upscaling past 1:1).
//
// The scaled frame is positioned ABSOLUTELY so it can't inflate the container we
// measure against: the container gets a real height only when nothing in-flow
// forces it taller, and an in-flow fixed/derived height fed back on the
// measurement and pushed the page's content out of view.
//
// The modal passes previewToolbar={false} (there's nothing to put in the toolbar —
// no device selector, no URL tabs), so the preview lands directly in the pane with
// no header and no scroll container. Unlike DesktopChrome — which gutters the sides
// and runs flush to the bottom because a toolbar supplies its top spacing — this
// pane has no header, so the card is inset evenly on all four sides and rounded on
// every corner. The gradient behind it is applied here rather than via
// previewBgColor, which only takes effect on the toolbar layout.
//
// The outer flex + `w-full` (rather than `h-full`) on the card is what makes the
// card stretch: as a stretched flex item its height comes from the padded content
// box directly, with no percentage to resolve against an ancestor.
const DESIGN_WIDTH = 1280;

interface GiftPreviewProps {
    localSettings: Setting[];
    localTiers?: Tier[];
}

const GiftPreview: React.FC<GiftPreviewProps> = ({localSettings, localTiers}) => {
    const {siteData, config} = useGlobalData();
    const containerRef = useRef<HTMLDivElement>(null);
    const [frame, setFrame] = useState({scale: 0, width: 0, height: 0});

    // Recomputed every render and handed straight to the iframe, exactly as
    // PortalPreview does it — that's what makes the preview track typing.
    const href = getGiftPreviewUrl({
        settings: localSettings,
        tiers: localTiers,
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
        <div className='flex size-full bg-gradient-to-tr from-white to-[#f9f9fa] p-8 dark:from-grey-950 dark:to-black'>
            <div ref={containerRef} className='relative w-full overflow-hidden rounded-lg bg-white shadow-sm dark:bg-black'>
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
        </div>
    );
};

export default GiftPreview;
