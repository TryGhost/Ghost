export function previewRuntimeBootstrap(): void {
    const limits = {
        outline: 100,
        text: 16 * 1024,
        elementText: 2 * 1024,
        target: 512,
        attribute: 1_024,
        style: 512,
        screenshotDocument: 4 * 1024 * 1024
    };
    const runtimeScript = document.currentScript as HTMLScriptElement | null;
    const channel = runtimeScript?.dataset.builderChannel;
    const documentId = runtimeScript?.dataset.builderDocument;
    const selectedId = runtimeScript?.dataset.builderSelection || null;
    if (!channel || !documentId) {
        return;
    }
    const parentPostMessage = window.parent.postMessage.bind(window.parent);
    const commandChannel = new MessageChannel();
    const commandPort = commandChannel.port1;
    const portAddEventListener = commandPort.addEventListener.bind(commandPort);
    const portStart = commandPort.start.bind(commandPort);
    const portPostMessage = commandPort.postMessage.bind(commandPort);
    const send = (message: Record<string, unknown>) => parentPostMessage({channel, documentId, ...message}, '*');
    const fail = (code: string, message: string): Error & {code: string} => Object.assign(new Error(message), {code});
    const bounded = (value: string, limit: number) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        return {text: normalized.slice(0, limit), truncated: normalized.length > limit};
    };
    const inaccessible = (element: Element) => {
        let current: Element | null = element;
        while (current) {
            const styles = window.getComputedStyle(current);
            if (current.hasAttribute('hidden') || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true' || styles.display === 'none' || styles.visibility === 'hidden' || styles.visibility === 'collapse') {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    };
    const visibleText = (element: Element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const chunks: string[] = [];
        let node = walker.nextNode();
        while (node) {
            if (node.parentElement && !node.parentElement.closest('script,style,noscript,template') && !inaccessible(node.parentElement)) {
                chunks.push(node.textContent ?? '');
            }
            node = walker.nextNode();
        }
        return chunks.join(' ');
    };
    const parseSource = (value: string | null) => {
        const match = value?.match(/^(.*):(\d+):(\d+)$/);
        const line = Number(match?.[2]);
        const column = Number(match?.[3]);
        if (!match || !match[1] || !Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(column) || column < 1) {
            return {source: null, truncated: false};
        }
        return {
            source: {path: match[1].slice(0, limits.target), line, column},
            truncated: match[1].length > limits.target
        };
    };
    const inputRole = (element: Element) => {
        const type = (element.getAttribute('type') || 'text').toLowerCase();
        if (['button', 'image', 'reset', 'submit'].includes(type)) {
            return 'button';
        }
        return ({checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton', search: 'searchbox', hidden: ''} as Record<string, string>)[type] ?? 'textbox';
    };
    const role = (element: Element) => {
        const explicit = element.getAttribute('role')?.trim();
        if (explicit) {
            return explicit.slice(0, 64);
        }
        if (/^H[1-6]$/.test(element.tagName)) {
            return 'heading';
        }
        if (element.tagName === 'A') {
            return element.hasAttribute('href') ? 'link' : '';
        }
        if (element.tagName === 'INPUT') {
            return inputRole(element);
        }
        if (element.tagName === 'SELECT' && (element.hasAttribute('multiple') || Number(element.getAttribute('size')) > 1)) {
            return 'listbox';
        }
        return ({ASIDE: 'complementary', BUTTON: 'button', FOOTER: 'contentinfo', FORM: 'form', HEADER: 'banner', MAIN: 'main', NAV: 'navigation', SELECT: 'combobox', TEXTAREA: 'textbox'} as Record<string, string>)[element.tagName] ?? '';
    };
    const hiddenForName = (element: Element) => {
        const styles = window.getComputedStyle(element);
        return element.hasAttribute('hidden') || element.hasAttribute('inert') || element.getAttribute('aria-hidden') === 'true' || styles.display === 'none' || styles.visibility === 'hidden' || styles.visibility === 'collapse';
    };
    const descendantName = (element: Element): string => Array.from(element.childNodes).map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent ?? '';
        }
        if (!(node instanceof Element) || hiddenForName(node)) {
            return '';
        }
        return node.getAttribute('aria-label') || node.getAttribute('alt') || descendantName(node);
    }).join(' ');
    const name = (element: Element) => {
        const labelledBy = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        const labels = (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).labels;
        const nativeLabels = labels ? Array.from(labels).map(label => label.textContent ?? '').join(' ') : '';
        const inputType = (element.getAttribute('type') || '').toLowerCase();
        const inputValue = element.tagName === 'INPUT' && ['button', 'reset', 'submit'].includes(inputType) ? element.getAttribute('value') : null;
        const value = element.getAttribute('aria-label') || labelledBy || nativeLabels || element.getAttribute('alt') || element.getAttribute('title') || inputValue || descendantName(element);
        return bounded(value, 256).text;
    };
    const resolveElement = (target: {marker?: unknown; selector?: unknown}) => {
        const hasMarker = typeof target?.marker === 'string' && target.marker.length > 0;
        const hasSelector = typeof target?.selector === 'string' && target.selector.length > 0;
        if (hasMarker === hasSelector) {
            throw fail('invalid_preview_target', 'Provide exactly one source marker or preview selector.');
        }
        const value = (hasMarker ? target.marker : target.selector) as string;
        if (value.length > limits.target) {
            throw fail('preview_target_too_large', `Preview targets must stay under ${limits.target} characters.`);
        }
        let element: Element | null = null;
        if (hasMarker) {
            element = Array.from(document.querySelectorAll('[data-edit]')).find(candidate => candidate.getAttribute('data-edit') === value) ?? null;
        } else {
            try {
                element = document.querySelector(value);
            } catch {
                throw fail('invalid_preview_selector', 'The preview selector is invalid.');
            }
        }
        if (!element) {
            throw fail('preview_element_not_found', 'No preview element matches the requested target.');
        }
        if (inaccessible(element)) {
            throw fail('preview_element_inaccessible', 'The matching preview element is hidden or inaccessible.');
        }
        return element;
    };
    const inspectPage = () => {
        const selector = '[role],header,nav,main,aside,footer,form,h1,h2,h3,h4,h5,h6,a[href],button,input,select,textarea';
        const candidates = Array.from(document.querySelectorAll(selector)).filter(element => !inaccessible(element));
        const outline = candidates.slice(0, limits.outline).map((element) => {
            const source = parseSource(element.getAttribute('data-edit'));
            return {tag: element.tagName.toLowerCase(), role: role(element), name: name(element), source: source.source, sourceTruncated: source.truncated};
        });
        const text = bounded(document.body ? visibleText(document.body) : '', limits.text);
        return {
            url: document.baseURI,
            title: bounded(document.title, 512).text,
            viewport: {width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY},
            outline,
            text: text.text,
            truncated: {outline: candidates.length > outline.length, text: text.truncated, source: outline.some(item => item.sourceTruncated)}
        };
    };
    const inspectElement = (target: {marker?: unknown; selector?: unknown}) => {
        const element = resolveElement(target);
        const attributes = Object.fromEntries(['id', 'class', 'role', 'aria-label', 'aria-labelledby', 'href', 'src', 'alt', 'title', 'type', 'name', 'data-edit'].flatMap((attribute) => {
            const value = element.getAttribute(attribute);
            return value === null ? [] : [[attribute, value.slice(0, limits.attribute)]];
        }));
        const computed = window.getComputedStyle(element);
        const styles = Object.fromEntries((['display', 'position', 'visibility', 'opacity', 'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'width', 'height', 'margin', 'padding', 'gap', 'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems', 'borderRadius'] as const).flatMap((property) => {
            const value = computed[property];
            return typeof value === 'string' && value ? [[property, value.slice(0, limits.style)]] : [];
        }));
        const bounds = element.getBoundingClientRect();
        const text = bounded(visibleText(element), limits.elementText);
        const source = parseSource(element.getAttribute('data-edit'));
        return {
            tag: element.tagName.toLowerCase(),
            role: role(element),
            accessibleName: name(element),
            attributes,
            box: {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height},
            styles,
            text: text.text,
            source: source.source,
            truncated: {text: text.truncated, source: source.truncated}
        };
    };
    const screenshotSnapshot = () => {
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        const originals = [document.documentElement, ...Array.from(document.documentElement.querySelectorAll('*'))];
        const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
        let unavailableCanvases = 0;
        originals.forEach((original, index) => {
            const copy = copies[index];
            if (!copy) {
                return;
            }
            if (original instanceof HTMLCanvasElement) {
                try {
                    const image = document.createElement('img');
                    Array.from(copy.attributes).forEach(attribute => image.setAttribute(attribute.name, attribute.value));
                    const bounds = original.getBoundingClientRect();
                    image.src = original.toDataURL('image/png');
                    image.width = original.width;
                    image.height = original.height;
                    image.style.width = `${bounds.width}px`;
                    image.style.height = `${bounds.height}px`;
                    copy.replaceWith(image);
                } catch {
                    unavailableCanvases += 1;
                    const placeholder = document.createElement('div');
                    Array.from(copy.attributes).forEach(attribute => placeholder.setAttribute(attribute.name, attribute.value));
                    const bounds = original.getBoundingClientRect();
                    placeholder.textContent = 'Canvas unavailable in screenshot';
                    placeholder.style.cssText = `width:${bounds.width}px;height:${bounds.height}px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#4b5563;font:14px sans-serif`;
                    copy.replaceWith(placeholder);
                }
            } else if (original instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
                if (original.type !== 'file') {
                    copy.value = original.value;
                    copy.setAttribute('value', original.value);
                }
                copy.checked = original.checked;
                copy.toggleAttribute('checked', original.checked);
            } else if (original instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
                copy.value = original.value;
                copy.textContent = original.value;
            } else if (original instanceof HTMLOptionElement && copy instanceof HTMLOptionElement) {
                copy.selected = original.selected;
                copy.toggleAttribute('selected', original.selected);
            }
        });
        const html = `<!doctype html>${clone.outerHTML}`;
        if (html.length > limits.screenshotDocument) {
            throw fail('preview_screenshot_failed', 'The preview document exceeds the screenshot size limit.');
        }
        return {
            html,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: window.scrollX,
                scrollY: window.scrollY
            },
            warnings: unavailableCanvases ? [`${unavailableCanvases} canvas${unavailableCanvases === 1 ? ' was' : 'es were'} replaced in the screenshot because its pixels could not be read.`] : []
        };
    };
    const context = (element: Element) => {
        const marker = element.getAttribute('data-edit')?.slice(0, limits.target) ?? null;
        const source = parseSource(marker);
        if (!marker || !source.source || source.truncated) {
            return null;
        }
        return {
            id: marker,
            label: bounded(element.getAttribute('aria-label') || visibleText(element) || element.tagName.toLowerCase(), 120).text || element.tagName.toLowerCase(),
            data: {tagName: element.tagName.toLowerCase(), marker, source: source.source}
        };
    };
    const navigateForm = (form: HTMLFormElement, submitter?: HTMLElement) => {
        if (form.method.toLowerCase() !== 'get') {
            send({type: 'runtime-error', message: `Preview form method ${form.method.toUpperCase()} is not supported; use a GET form for virtual navigation.`});
            return;
        }
        const destination = new URL(form.action || document.baseURI, document.baseURI);
        const fields = submitter ? new FormData(form, submitter) : new FormData(form);
        const query = new URLSearchParams();
        fields.forEach((value, key) => {
            if (typeof value === 'string') {
                query.append(key, value);
            }
        });
        destination.search = query.toString();
        send({type: 'navigate', url: destination.href});
    };

    window.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const editable = target?.closest('[data-edit]');
        const selection = editable ? context(editable) : null;
        if (selection) {
            event.preventDefault();
            event.stopImmediatePropagation();
            send({type: 'select', selection});
            return;
        }
        const submitter = target?.closest('button[type="submit"],button:not([type]),input[type="submit"],input[type="image"]') as HTMLButtonElement | HTMLInputElement | null;
        if (submitter?.form) {
            event.preventDefault();
            event.stopImmediatePropagation();
            navigateForm(submitter.form, submitter);
            return;
        }
        const anchor = target?.closest('a[href]');
        if (anchor) {
            event.preventDefault();
            event.stopImmediatePropagation();
            send({type: 'navigate', url: (anchor as HTMLAnchorElement).href});
        }
    }, true);
    window.addEventListener('submit', (event) => {
        const form = event.target instanceof HTMLFormElement ? event.target : null;
        if (!form) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const submitter = event instanceof SubmitEvent && event.submitter instanceof HTMLElement ? event.submitter : undefined;
        navigateForm(form, submitter);
    }, true);
    window.addEventListener('keydown', (event) => {
        const control = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
        if (event.key !== 'Enter' || !control?.form) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateForm(control.form);
    }, true);
    window.addEventListener('error', event => send({type: 'runtime-error', message: String(event.message || 'Preview script failed').slice(0, 2_000)}));
    window.addEventListener('unhandledrejection', event => send({type: 'runtime-error', message: String((event.reason as Error)?.message || event.reason || 'Unhandled preview rejection').slice(0, 2_000)}));
    window.addEventListener('load', () => send({type: 'loaded'}), {once: true});
    const handleCommand = (event: MessageEvent<unknown>) => {
        const message = event.data as {channel?: unknown; documentId?: unknown; type?: unknown; requestId?: unknown; command?: unknown; payload?: unknown};
        if (message.channel !== channel || message.documentId !== documentId || message.type !== 'command' || !Number.isInteger(message.requestId) || !['inspect-page', 'inspect-element', 'screenshot'].includes(String(message.command))) {
            return;
        }
        try {
            let result: unknown;
            if (message.command === 'inspect-page') {
                result = inspectPage();
            } else if (message.command === 'inspect-element') {
                result = inspectElement(message.payload as {marker?: unknown; selector?: unknown});
            } else {
                result = screenshotSnapshot();
            }
            portPostMessage({channel, documentId, type: 'command-result', requestId: message.requestId, ok: true, result});
        } catch (cause) {
            const error = cause as Error & {code?: string};
            portPostMessage({channel, documentId, type: 'command-result', requestId: message.requestId, ok: false, error: {code: error.code || (message.command === 'screenshot' ? 'preview_screenshot_failed' : 'preview_inspection_failed'), message: String(error.message || error).slice(0, 2_000)}});
        }
    };
    portAddEventListener('message', handleCommand as EventListener);
    portStart();
    parentPostMessage({channel, documentId, type: 'command-port'}, '*', [commandChannel.port2]);

    const ready = () => {
        const selected = selectedId ? Array.from(document.querySelectorAll('[data-edit]')).find(element => element.getAttribute('data-edit') === selectedId) : null;
        send({type: 'ready', selection: selected ? context(selected) : null});
    };
    runtimeScript?.remove();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready, {once: true});
    } else {
        ready();
    }
}
