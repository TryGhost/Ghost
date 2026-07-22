import { useCallback } from "react";
import IframeBuffering from "@tryghost/admin-x-settings/src/utils/iframe-buffering";

/**
 * Double-buffered site preview iframe: POSTs the page with the
 * `x-ghost-preview` header and writes the doctored HTML into the buffered
 * iframes — the transport shared by the legacy design and announcement-bar
 * previews (their `getPreviewData` param encodings live with the callers).
 */

export interface SitePreviewFrameProps {
    url: string;
    /** URLSearchParams-encoded x-ghost-preview header; undefined skips fetching (still loading). */
    previewData: string | undefined;
    testId: string;
    /** Legacy announcement preview delays the buffer swap by 500ms. */
    addDelay?: boolean;
}

export function SitePreviewFrame({ url, previewData, testId, addDelay = false }: SitePreviewFrameProps) {
    const injectContentIntoIframe = useCallback((iframe: HTMLIFrameElement) => {
        if (!url || previewData === undefined) {
            return;
        }

        // Fetch theme preview HTML (suppress admin toolbar in preview)
        const previewUrl = new URL(url);
        previewUrl.searchParams.set("admin_toolbar", "0");

        fetch(previewUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "text/html;charset=utf-8",
                "x-ghost-preview": previewData,
                Accept: "text/html",
            },
            mode: "cors",
            credentials: "include",
        })
            .then((response) => response.text())
            .then((data) => {
                // inject extra CSS to disable navigation and prevent clicks
                const injectedCss = "html { pointer-events: none; }";

                const domParser = new DOMParser();
                const htmlDoc = domParser.parseFromString(data, "text/html");

                const stylesheet = htmlDoc.querySelector("style");
                const originalCSS = stylesheet?.innerHTML;
                if (stylesheet && originalCSS) {
                    stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;
                } else {
                    htmlDoc.head.innerHTML += `<style>${injectedCss}</style>`;
                }

                const doctype = htmlDoc.doctype ? new XMLSerializer().serializeToString(htmlDoc.doctype) : "";
                const finalDoc = doctype + htmlDoc.documentElement.outerHTML;

                iframe.contentDocument?.open();
                iframe.contentDocument?.write(finalDoc);
                iframe.contentDocument?.close();
            })
            .catch(() => {
                // ignore preview fetch errors (the pane simply stays blank)
            });
    }, [previewData, url]);

    return (
        <IframeBuffering
            addDelay={addDelay}
            className="absolute size-[110%] origin-top-left scale-[.90909] bg-white max-[1600px]:size-[130%] max-[1600px]:scale-[.76923]"
            generateContent={injectContentIntoIframe}
            height="100%"
            parentClassName="relative h-full w-full"
            testId={testId}
            width="100%"
        />
    );
}
