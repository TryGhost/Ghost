import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {usePreferencesForUser} from '@hooks/use-activity-pub-queries';

interface SensitiveMediaDisclosureOptions {
    contentWarning?: string | null;
    sensitive?: boolean;
    /**
     * Whether the post actually carries media worth concealing. Each surface
     * detects this differently — the feed looks at attachments, the reader also
     * considers the feature image and media embedded in the article body.
     */
    hasMedia: boolean;
    /**
     * Resets the disclosure state when it changes, so a revealed post never
     * leaks its reveal into the next post rendered by the same component.
     */
    resetKey?: string;
}

interface SensitiveMediaDisclosure {
    contentWarning: string | null;
    shouldHideContentWarning: boolean;
    shouldHideSensitiveMedia: boolean;
    canHideSensitiveMedia: boolean;
    isContentWarningRevealed: boolean;
    showContentWarningOverlay: boolean;
    contentWarningMinHeight: number | undefined;
    contentWarningWrapperRef: React.RefObject<HTMLDivElement>;
    revealSensitiveMedia: (event: React.MouseEvent) => void;
    hideSensitiveMedia: (event: React.MouseEvent) => void;
    revealContentWarning: (event: React.MouseEvent) => void;
}

/**
 * Owns the reveal/hide state for sensitive media and content warnings.
 *
 * Both disclosures fail closed: until the preferences query resolves, and
 * whenever it fails, sensitive media stays hidden.
 *
 * A content warning covers the whole post, so it also covers any media inside
 * it. Revealing the warning therefore reveals the media too, rather than
 * stacking a second warning on top of the first.
 */
export function useSensitiveMediaDisclosure({
    contentWarning: rawContentWarning,
    sensitive,
    hasMedia,
    resetKey
}: SensitiveMediaDisclosureOptions): SensitiveMediaDisclosure {
    const {data: preferences} = usePreferencesForUser();
    const showSensitiveMediaByDefault = preferences?.showSensitiveMedia ?? false;

    const [isSensitiveMediaRevealed, setIsSensitiveMediaRevealed] = useState(false);
    const [isSensitiveMediaManuallyHidden, setIsSensitiveMediaManuallyHidden] = useState(false);
    const [isContentWarningRevealed, setIsContentWarningRevealed] = useState(false);
    const [showContentWarningOverlay, setShowContentWarningOverlay] = useState(true);
    const [contentWarningMinHeight, setContentWarningMinHeight] = useState<number | undefined>(undefined);
    const contentWarningWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsSensitiveMediaRevealed(false);
        setIsSensitiveMediaManuallyHidden(false);
        setIsContentWarningRevealed(false);
        setShowContentWarningOverlay(true);
        setContentWarningMinHeight(undefined);
    }, [resetKey]);

    useLayoutEffect(() => {
        if (!isContentWarningRevealed || !showContentWarningOverlay) {
            return;
        }

        // Content is mounted under the overlay; remove the overlay before paint
        // so the browser never paints an empty intermediate frame.
        setShowContentWarningOverlay(false);
        setContentWarningMinHeight(undefined);
    }, [isContentWarningRevealed, showContentWarningOverlay]);

    const contentWarning = rawContentWarning?.trim() || null;
    const hasContentWarning = contentWarning !== null;
    const hasSensitiveMedia = sensitive === true && hasMedia;
    const isSensitiveMediaGated = hasSensitiveMedia && !hasContentWarning && !showSensitiveMediaByDefault;
    const shouldHideSensitiveMedia = isSensitiveMediaGated && (isSensitiveMediaManuallyHidden || !isSensitiveMediaRevealed);

    const revealSensitiveMedia = (event: React.MouseEvent) => {
        event.stopPropagation();
        setIsSensitiveMediaManuallyHidden(false);
        setIsSensitiveMediaRevealed(true);
    };

    const hideSensitiveMedia = (event: React.MouseEvent) => {
        event.stopPropagation();
        setIsSensitiveMediaManuallyHidden(true);
        setIsSensitiveMediaRevealed(false);
    };

    const revealContentWarning = (event: React.MouseEvent) => {
        event.stopPropagation();
        // Pin the collapsed height so the post doesn't jump while the revealed
        // content mounts underneath the overlay.
        const height = contentWarningWrapperRef.current?.offsetHeight;
        if (height) {
            setContentWarningMinHeight(height);
        }
        setIsContentWarningRevealed(true);
    };

    return {
        contentWarning,
        shouldHideContentWarning: hasContentWarning && !isContentWarningRevealed,
        shouldHideSensitiveMedia,
        canHideSensitiveMedia: isSensitiveMediaGated && !shouldHideSensitiveMedia,
        isContentWarningRevealed,
        showContentWarningOverlay,
        contentWarningMinHeight,
        contentWarningWrapperRef,
        revealSensitiveMedia,
        hideSensitiveMedia,
        revealContentWarning
    };
}
