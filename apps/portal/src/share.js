import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom';
import Frame from './components/frame';
import ShareModal from './components/pages/share/share-modal';
import ShareShellStyles from './components/pages/share/share-shell.styles';
import i18n from './utils/i18n';

const ROOT_DIV_ID = 'ghost-portal-share-root';
const SHARE_HASH_REGEX = /^#\/share\/?$/;

const getScriptData = () => {
    const scriptTag = document.querySelector('script[data-portal-share]');
    return {
        locale: scriptTag?.dataset.locale || 'en',
        accentColor: scriptTag?.dataset.accentColor || ''
    };
};

const isShareHash = () => SHARE_HASH_REGEX.test(window.location.hash);

const getSameOriginShareLink = (target) => {
    const anchor = target?.closest?.('a[href]');
    if (!anchor) {
        return null;
    }

    try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && SHARE_HASH_REGEX.test(url.hash)) {
            return anchor;
        }
    } catch {
        // Ignore invalid hrefs
    }

    return null;
};

const getModalContainerStyle = () => ({
    position: 'fixed',
    inset: 0,
    zIndex: '3999999',
    overflow: 'hidden'
});

const getFrameStyle = () => ({
    margin: 'auto',
    position: 'relative',
    padding: '0',
    outline: '0',
    width: '100%',
    height: '100%',
    opacity: '1',
    overflow: 'hidden'
});

const getScrollbarWidth = () => {
    const div = document.createElement('div');
    div.style.visibility = 'hidden';
    div.style.overflow = 'scroll';
    document.body.appendChild(div);

    const scrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);

    return scrollbarWidth;
};

const clearShareHash = () => {
    if (!isShareHash()) {
        return;
    }

    window.history.pushState('', document.title, window.location.pathname + window.location.search);
};

function addRootDiv() {
    let elem = document.getElementById(ROOT_DIV_ID);
    if (!elem) {
        elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        elem.setAttribute('data-testid', 'portal-share-root');
        document.body.appendChild(elem);
    }
    return elem;
}

const ShareShell = ({accentColor}) => {
    const [isOpen, setIsOpen] = useState(isShareHash);
    const [frameDocument, setFrameDocument] = useState(null);
    const containerRef = useRef(null);
    const bodyOverflowRef = useRef('');
    const bodyMarginRef = useRef('');
    const dir = i18n.dir() || 'ltr';

    useEffect(() => {
        const onHashChange = () => {
            if (isShareHash()) {
                setIsOpen(true);
            }
        };

        const onClick = (event) => {
            if (event.target?.closest?.('[data-portal="share"]')) {
                event.preventDefault();
                setIsOpen(true);
                return;
            }

            if (getSameOriginShareLink(event.target)) {
                event.preventDefault();
                if (!isShareHash()) {
                    window.location.hash = '#/share';
                }
                setIsOpen(true);
            }
        };

        window.addEventListener('hashchange', onHashChange);
        document.addEventListener('click', onClick);

        return () => {
            window.removeEventListener('hashchange', onHashChange);
            document.removeEventListener('click', onClick);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        bodyOverflowRef.current = document.body.style.overflow;
        bodyMarginRef.current = window.getComputedStyle(document.body).getPropertyValue('margin-right');
        document.body.style.overflow = 'hidden';
        const scrollbarWidth = getScrollbarWidth();
        if (scrollbarWidth) {
            document.body.style.marginRight = `calc(${bodyMarginRef.current} + ${scrollbarWidth}px)`;
        }

        return () => {
            document.body.style.overflow = bodyOverflowRef.current || '';
            if (!bodyMarginRef.current || bodyMarginRef.current === '0px') {
                document.body.style.marginRight = '';
            } else {
                document.body.style.marginRight = bodyMarginRef.current;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !frameDocument) {
            return;
        }

        const onKeyUp = (event) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        frameDocument.addEventListener('keyup', onKeyUp);
        containerRef.current?.focus();

        return () => {
            frameDocument.removeEventListener('keyup', onKeyUp);
        };
    }, [frameDocument, isOpen]);

    const close = () => {
        setIsOpen(false);
        clearShareHash();
    };

    const setContainerNode = useCallback((node) => {
        containerRef.current = node;
        const nextDocument = node?.ownerDocument || null;
        setFrameDocument((currentDocument) => {
            return currentDocument === nextDocument ? currentDocument : nextDocument;
        });
    }, []);

    const renderFrameHead = () => {
        const styles = accentColor
            ? `${ShareShellStyles}:root { --brandcolor: ${accentColor}; }`
            : ShareShellStyles;

        return (
            <>
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </>
        );
    };

    const onBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            close();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div style={getModalContainerStyle()}>
            <Frame
                dataDir={dir}
                dataTestId='portal-share-frame'
                head={renderFrameHead()}
                style={getFrameStyle()}
                title='portal-share'
            >
                <div className='gh-portal-share-shell' dir={dir}>
                    <div className='gh-portal-popup-background' onClick={close}></div>
                    <div className='gh-portal-popup-wrapper share' onClick={onBackdropClick}>
                        <div className='gh-portal-popup-container share' ref={setContainerNode} tabIndex={-1}>
                            <ShareModal onClose={close} />
                        </div>
                    </div>
                </div>
            </Frame>
        </div>
    );
};

function init() {
    const {locale, accentColor} = getScriptData();
    i18n.changeLanguage(locale);

    ReactDOM.render(
        <React.StrictMode>
            <ShareShell accentColor={accentColor} />
        </React.StrictMode>,
        addRootDiv()
    );
}

init();
