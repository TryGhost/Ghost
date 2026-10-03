export function previewRuntimeBootstrap(): void {
  const limits = {
    outline: 100,
    text: 16 * 1024,
    elementText: 2 * 1024,
    target: 512,
    attribute: 1_024,
    style: 512,
    screenshotDocument: 4 * 1024 * 1024,
    screenshotImages: 16,
    screenshotImageDimension: 4_096,
    screenshotImagePixels: 4 * 1024 * 1024,
    screenshotTotalImagePixels: 16 * 1024 * 1024,
    screenshotImageCharacters: 1024 * 1024,
    screenshotTotalImageCharacters: 2 * 1024 * 1024,
  };
  const runtimeScript = document.currentScript as HTMLScriptElement | null;
  const channel = runtimeScript?.dataset.builderChannel;
  const documentId = runtimeScript?.dataset.builderDocument;
  const selectedId = runtimeScript?.dataset.builderSelection || null;
  let inlineEditing = runtimeScript?.dataset.builderInlineEditing === 'true';
  let selectionMode = runtimeScript?.dataset.builderSelectionMode === 'true';
  const nativeForms = runtimeScript?.dataset.builderNativeForms === 'true';
  const artifactDocument = runtimeScript?.dataset.builderArtifactDocument === 'true';
  const canvasNavigation = runtimeScript?.dataset.builderCanvasNavigation === 'true';
  const canvasPanning = runtimeScript?.dataset.builderCanvasPanning === 'true';
  const inlineImageEditing = runtimeScript?.dataset.builderInlineImageEditing !== 'false';
  const requestedMarkerAttribute = runtimeScript?.dataset.builderEditMarkerAttribute ?? 'data-edit';
  const editMarkerAttribute = /^data-[a-z][a-z0-9-]{0,127}$/.test(requestedMarkerAttribute)
    ? requestedMarkerAttribute
    : 'data-edit';
  let inlineTextTargets: Record<string, string> = {};
  try {
    const targets: unknown = JSON.parse(runtimeScript?.dataset.builderInlineTextTargets ?? '{}');
    if (targets && typeof targets === 'object' && !Array.isArray(targets)) {
      inlineTextTargets = Object.fromEntries(
        Object.entries(targets).filter(
          ([marker, tag]) =>
            marker.length <= limits.target &&
            typeof tag === 'string' &&
            /^[a-z][a-z0-9-]{0,63}$/.test(tag),
        ),
      );
    }
  } catch {
    // Missing or invalid source proof never enables a canvas text editor.
  }
  let canvasCommitted = !canvasNavigation;
  const captureLoadedImages = runtimeScript?.dataset.builderCaptureLoadedImages === 'true';
  const artifactMarkers = new WeakMap<Element, string>();
  const artifactElementFingerprints = new WeakMap<Element, string>();
  const artifactElementIdentities = new WeakMap<
    Element,
    { baseFingerprint: string; occurrence: number; reusable: boolean }
  >();
  const artifactElements = new Map<string, Element>();
  const artifactFingerprints = new Map<string, Element>();
  const artifactFingerprintCounts = new Map<string, number>();
  const artifactFingerprintFreeSlots = new Map<string, { slots: number[]; head: number }>();
  const artifactFingerprintActiveCounts = new Map<string, number>();
  if (!channel || !documentId) {
    return;
  }
  const parentPostMessage = window.parent.postMessage.bind(window.parent);
  const commandChannel = new MessageChannel();
  const commandPort = commandChannel.port1;
  const portAddEventListener = commandPort.addEventListener.bind(commandPort);
  const portStart = commandPort.start.bind(commandPort);
  const portPostMessage = commandPort.postMessage.bind(commandPort);
  let interactionTime = 0;
  if (canvasNavigation) {
    for (const eventType of ['click', 'keydown', 'drop']) {
      window.addEventListener(
        eventType,
        (event) => {
          if (event.isTrusted) {
            interactionTime = performance.timeOrigin + event.timeStamp;
          }
        },
        true,
      );
    }
  }
  const send = (message: Record<string, unknown>) =>
    parentPostMessage(
      {
        channel,
        documentId,
        ...message,
        ...(canvasNavigation && ['select', 'inline-text-admission'].includes(String(message.type))
          ? { interactionTime }
          : {}),
      },
      '*',
    );
  const fail = (code: string, message: string): Error & { code: string } =>
    Object.assign(new Error(message), { code });
  const bounded = (value: string, limit: number) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return { text: normalized.slice(0, limit), truncated: normalized.length > limit };
  };
  const inaccessible = (element: Element) => {
    let current: Element | null = element;
    while (current) {
      const styles = window.getComputedStyle(current);
      if (
        current.hasAttribute('hidden') ||
        current.hasAttribute('inert') ||
        current.getAttribute('aria-hidden') === 'true' ||
        styles.display === 'none' ||
        styles.visibility === 'hidden' ||
        styles.visibility === 'collapse'
      ) {
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
      if (
        node.parentElement &&
        !node.parentElement.closest('script,style,noscript,template') &&
        !inaccessible(node.parentElement)
      ) {
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
    if (
      !match ||
      !match[1] ||
      !Number.isSafeInteger(line) ||
      line < 1 ||
      !Number.isSafeInteger(column) ||
      column < 1
    ) {
      return { source: null, truncated: false };
    }
    return {
      source: { path: match[1].slice(0, limits.target), line, column },
      truncated: match[1].length > limits.target,
    };
  };
  const inputRole = (element: Element) => {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    if (['button', 'image', 'reset', 'submit'].includes(type)) {
      return 'button';
    }
    return (
      (
        {
          checkbox: 'checkbox',
          radio: 'radio',
          range: 'slider',
          number: 'spinbutton',
          search: 'searchbox',
          hidden: '',
        } as Record<string, string>
      )[type] ?? 'textbox'
    );
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
    if (
      element.tagName === 'SELECT' &&
      (element.hasAttribute('multiple') || Number(element.getAttribute('size')) > 1)
    ) {
      return 'listbox';
    }
    return (
      (
        {
          ASIDE: 'complementary',
          BUTTON: 'button',
          FOOTER: 'contentinfo',
          FORM: 'form',
          HEADER: 'banner',
          MAIN: 'main',
          NAV: 'navigation',
          SELECT: 'combobox',
          TEXTAREA: 'textbox',
        } as Record<string, string>
      )[element.tagName] ?? ''
    );
  };
  const hiddenForName = (element: Element) => {
    const styles = window.getComputedStyle(element);
    return (
      element.hasAttribute('hidden') ||
      element.hasAttribute('inert') ||
      element.getAttribute('aria-hidden') === 'true' ||
      styles.display === 'none' ||
      styles.visibility === 'hidden' ||
      styles.visibility === 'collapse'
    );
  };
  const descendantName = (element: Element): string =>
    Array.from(element.childNodes)
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent ?? '';
        }
        if (!(node instanceof Element) || hiddenForName(node)) {
          return '';
        }
        return node.getAttribute('aria-label') || node.getAttribute('alt') || descendantName(node);
      })
      .join(' ');
  const name = (element: Element) => {
    const labelledBy = (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    const labels = (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).labels;
    const nativeLabels = labels
      ? Array.from(labels)
          .map((label) => label.textContent ?? '')
          .join(' ')
      : '';
    const inputType = (element.getAttribute('type') || '').toLowerCase();
    const inputValue =
      element.tagName === 'INPUT' && ['button', 'reset', 'submit'].includes(inputType)
        ? element.getAttribute('value')
        : null;
    const value =
      element.getAttribute('aria-label') ||
      labelledBy ||
      nativeLabels ||
      element.getAttribute('alt') ||
      element.getAttribute('title') ||
      inputValue ||
      descendantName(element);
    return bounded(value, 256).text;
  };
  const resolveElement = (target: { marker?: unknown; selector?: unknown }) => {
    const hasMarker = typeof target?.marker === 'string' && target.marker.length > 0;
    const hasSelector = typeof target?.selector === 'string' && target.selector.length > 0;
    if (hasMarker === hasSelector) {
      throw fail(
        'invalid_preview_target',
        'Provide exactly one source marker or preview selector.',
      );
    }
    const value = (hasMarker ? target.marker : target.selector) as string;
    if (value.length > limits.target) {
      throw fail(
        'preview_target_too_large',
        `Preview targets must stay under ${limits.target} characters.`,
      );
    }
    let element: Element | null = null;
    if (hasMarker) {
      const artifactElement = artifactElements.get(value);
      if (artifactElement && !artifactElement.isConnected) {
        artifactElements.delete(value);
      }
      element = artifactElement?.isConnected
        ? artifactElement
        : (Array.from(document.querySelectorAll(`[${editMarkerAttribute}]`)).find(
            (candidate) => candidate.getAttribute(editMarkerAttribute) === value,
          ) ?? null);
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
      throw fail(
        'preview_element_inaccessible',
        'The matching preview element is hidden or inaccessible.',
      );
    }
    return element;
  };
  const inspectPage = () => {
    const selector =
      '[role],header,nav,main,aside,footer,form,h1,h2,h3,h4,h5,h6,a[href],button,input,select,textarea';
    const candidates = Array.from(document.querySelectorAll(selector)).filter(
      (element) => !inaccessible(element),
    );
    const outline = candidates.slice(0, limits.outline).map((element) => {
      const source = parseSource(
        artifactMarkers.get(element) ?? element.getAttribute(editMarkerAttribute),
      );
      return {
        tag: element.tagName.toLowerCase(),
        role: role(element),
        name: name(element),
        source: source.source,
        sourceTruncated: source.truncated,
      };
    });
    const text = bounded(document.body ? visibleText(document.body) : '', limits.text);
    return {
      url: document.baseURI,
      title: bounded(document.title, 512).text,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      outline,
      text: text.text,
      truncated: {
        outline: candidates.length > outline.length,
        text: text.truncated,
        source: outline.some((item) => item.sourceTruncated),
      },
    };
  };
  const inspectElement = (target: { marker?: unknown; selector?: unknown }) => {
    const element = resolveElement(target);
    const attributes = Object.fromEntries(
      [
        'id',
        'class',
        'role',
        'aria-label',
        'aria-labelledby',
        'href',
        'src',
        'alt',
        'title',
        'type',
        'name',
        'data-edit',
      ].flatMap((attribute) => {
        const value = element.getAttribute(attribute);
        return value === null ? [] : [[attribute, value.slice(0, limits.attribute)]];
      }),
    );
    const computed = window.getComputedStyle(element);
    const styles = Object.fromEntries(
      (
        [
          'display',
          'position',
          'visibility',
          'opacity',
          'color',
          'backgroundColor',
          'fontFamily',
          'fontSize',
          'fontWeight',
          'lineHeight',
          'textAlign',
          'width',
          'height',
          'margin',
          'padding',
          'gap',
          'gridTemplateColumns',
          'flexDirection',
          'justifyContent',
          'alignItems',
          'borderRadius',
        ] as const
      ).flatMap((property) => {
        const value = computed[property];
        return typeof value === 'string' && value ? [[property, value.slice(0, limits.style)]] : [];
      }),
    );
    const bounds = element.getBoundingClientRect();
    const text = bounded(visibleText(element), limits.elementText);
    const source = parseSource(
      artifactMarkers.get(element) ?? element.getAttribute(editMarkerAttribute),
    );
    return {
      tag: element.tagName.toLowerCase(),
      role: role(element),
      accessibleName: name(element),
      attributes,
      box: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      styles,
      text: text.text,
      source: source.source,
      truncated: { text: text.truncated, source: source.truncated },
    };
  };
  let screenshotSequence = 0;
  const screenshotSnapshot = (stable = false) => {
    screenshotSequence += 1;
    const token = `${documentId.replace(/[^a-z0-9]/gi, '').slice(0, 40)}-${screenshotSequence}`;
    const frozenAttribute = `data-builder-snapshot-${token.toLowerCase()}`;
    const sourceUnstyledAttribute = `${frozenAttribute}-unstyled`;
    const frozenRules: string[] = [];
    // Cloning into the active document can immediately refetch img sources,
    // even before insertion. Keep bitmap snapshots in a document with no window.
    const clone = (
      captureLoadedImages || stable
        ? document.implementation.createHTMLDocument('').importNode(document.documentElement, true)
        : document.documentElement.cloneNode(true)
    ) as HTMLElement;
    const originals = [
      document.documentElement,
      ...Array.from(document.documentElement.querySelectorAll('*')),
    ];
    const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
    const snapshotAnimations = new Map<Element, Animation[]>();
    if (stable) {
      // Element.getAnimations() omits animations on its pseudo-elements.
      for (const animation of document.getAnimations()) {
        const effect = animation.effect;
        if (!(effect instanceof KeyframeEffect) || !effect.target || effect.pseudoElement) {
          throw fail(
            'preview_snapshot_animation_unsupported',
            'This composition contains an animation that cannot be frozen reliably. Open the fixed device preview to inspect it.',
          );
        }
        const animations = snapshotAnimations.get(effect.target) ?? [];
        animations.push(animation);
        snapshotAnimations.set(effect.target, animations);
      }
    }
    let unavailableCanvases = 0;
    let frozenImages = 0;
    let omittedImages = 0;
    let limitedImages = 0;
    let attemptedImages = 0;
    let imagePixels = 0;
    let imageCharacters = 0;
    let frozenAnimations = 0;
    const imageBudget = Math.max(
      0,
      Math.min(
        limits.screenshotTotalImageCharacters,
        limits.screenshotDocument - clone.outerHTML.length - 1024,
      ),
    );
    const freezeSource = (image: HTMLImageElement) => {
      image.removeAttribute('srcset');
      // A picture source otherwise overrides the rasterized img src on reconstruction.
      if (image.parentElement?.tagName === 'PICTURE') {
        image.parentElement
          .querySelectorAll('source')
          .forEach((source) => source.removeAttribute('srcset'));
      }
    };
    const intrinsicImage = (original: HTMLImageElement, pixels = '', width = 0, height = 0) => {
      // Preserve intrinsic CSS dimensions without changing flex/grid sizing inputs.
      // A density-corrected PNG may need more raster pixels than naturalWidth.
      const image = pixels
        ? `<image width="${width}" height="${height}" preserveAspectRatio="none" href="${pixels}"/>`
        : '';
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${original.naturalWidth}" height="${original.naturalHeight}" viewBox="0 0 ${width || original.naturalWidth || 1} ${height || original.naturalHeight || 1}" preserveAspectRatio="none">${image}</svg>`,
      )}`;
    };
    const omitImage = (original: HTMLImageElement, copy: HTMLImageElement) => {
      freezeSource(copy);
      if (!original.complete || (original.naturalWidth && original.naturalHeight)) {
        copy.src = intrinsicImage(original);
      } else {
        // Keep missing/empty own src distinct from failed srcset/picture sources.
        // html2canvas normalizes a selected srcset into src, adding a broken icon.
        // An empty source keeps a selected failure's native zero-height/alt box.
        if (original.getAttribute('src')?.trim()) {
          copy.src = 'data:image/png;base64,AA==';
        } else if (original.currentSrc) {
          copy.setAttribute('src', '');
        } else if (original.getAttribute('srcset')?.trim()) {
          copy.removeAttribute('src');
        }
      }
      copy.style.backgroundColor = '#f3f4f6';
      omittedImages += 1;
    };
    const freezeImage = (original: HTMLImageElement, copy: HTMLImageElement) => {
      if (!original.complete || !original.naturalWidth || !original.naturalHeight) {
        omitImage(original, copy);
        return;
      }
      const style = getComputedStyle(original);
      const contentSize = (dimension: 'width' | 'height') => {
        const edges = dimension === 'width' ? ['Left', 'Right'] : ['Top', 'Bottom'];
        const paddingAndBorder =
          style.boxSizing === 'border-box'
            ? edges.reduce(
                (total, edge) =>
                  total +
                  (parseFloat(style.getPropertyValue(`padding-${edge.toLowerCase()}`)) || 0) +
                  (parseFloat(style.getPropertyValue(`border-${edge.toLowerCase()}-width`)) || 0),
                0,
              )
            : 0;
        return Math.max(0, (parseFloat(style[dimension]) || 0) - paddingAndBorder);
      };
      // naturalWidth is density-corrected for srcset. Draw the decoded source
      // directly at sufficient CSS-pixel resolution, retaining its aspect ratio.
      const scale = Math.max(
        1,
        contentSize('width') / original.naturalWidth,
        contentSize('height') / original.naturalHeight,
      );
      const width = Math.ceil(original.naturalWidth * scale);
      const height = Math.ceil(original.naturalHeight * scale);
      const pixels = width * height;
      if (
        attemptedImages >= limits.screenshotImages ||
        width > limits.screenshotImageDimension ||
        height > limits.screenshotImageDimension ||
        pixels > limits.screenshotImagePixels ||
        imagePixels + pixels > limits.screenshotTotalImagePixels
      ) {
        limitedImages += 1;
        omitImage(original, copy);
        return;
      }
      attemptedImages += 1;
      imagePixels += pixels;
      const bitmap = document.createElement('canvas');
      bitmap.width = width;
      bitmap.height = height;
      try {
        const context = bitmap.getContext('2d');
        if (!context) {
          throw new Error('Image bitmap unavailable.');
        }
        // Read only already decoded pixels. Browser origin checks still apply.
        context.drawImage(original, 0, 0, width, height);
        const png = bitmap.toDataURL('image/png');
        if (
          png.length > limits.screenshotImageCharacters ||
          imageCharacters + png.length > imageBudget
        ) {
          limitedImages += 1;
          omitImage(original, copy);
          return;
        }
        if (!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(png)) {
          throw new Error('The image encoder returned an invalid PNG bitmap.');
        }
        const dataUrl =
          width === original.naturalWidth && height === original.naturalHeight
            ? png
            : intrinsicImage(original, png, width, height);
        if (
          dataUrl.length > limits.screenshotImageCharacters ||
          imageCharacters + dataUrl.length > imageBudget
        ) {
          limitedImages += 1;
          omitImage(original, copy);
          return;
        }
        imageCharacters += dataUrl.length;
        freezeSource(copy);
        copy.src = dataUrl;
        frozenImages += 1;
      } catch {
        // Preserve HTTP sources for the existing external-image placeholder/warning.
        // Blob/data images must not silently disappear in the parent-origin reconstruction.
        if (!/^https?:/i.test(original.currentSrc || original.src)) {
          omitImage(original, copy);
        }
      } finally {
        bitmap.width = 0;
        bitmap.height = 0;
      }
    };
    originals.forEach((original, index) => {
      const copy = copies[index];
      if (!copy) {
        return;
      }
      if (stable) {
        if (
          original instanceof HTMLVideoElement ||
          (original.namespaceURI === 'http://www.w3.org/2000/svg' &&
            ['animate', 'animateTransform', 'animateMotion', 'set'].includes(original.localName))
        ) {
          throw fail(
            'preview_snapshot_animation_unsupported',
            'Live video or animated SVG cannot be frozen reliably in this composition. Open the fixed device preview to inspect it.',
          );
        }
        const animations = snapshotAnimations.get(original) ?? [];
        const computed = getComputedStyle(original);
        const backgrounds = [
          computed.backgroundImage,
          ...['::before', '::after'].map(
            (pseudo) => getComputedStyle(original, pseudo).backgroundImage,
          ),
        ];
        if (
          backgrounds.some((background) =>
            /url\(["']?(?:data:image\/gif[;,]|blob:)/i.test(background),
          )
        ) {
          throw fail(
            'preview_snapshot_animation_unsupported',
            'A background image has no reliable frozen-pixel snapshot. Open the fixed device preview to inspect it.',
          );
        }
        // Freeze in an owned stylesheet: adding an inline style attribute can
        // change author selectors such as body[style] or :has([style]).
        const style = document.createElement('span').style;
        const originalStyle = (original as HTMLElement).style;
        if (
          computed.animationName !== 'none' &&
          ['animation', 'animation-name'].some(
            (property) => originalStyle?.getPropertyPriority(property) === 'important',
          )
        ) {
          throw fail(
            'preview_snapshot_animation_unsupported',
            'An inline important animation cannot be suppressed reliably in the snapshot. Open the fixed device preview to inspect it.',
          );
        }
        for (const animation of animations) {
          const effect = animation.effect;
          if (!(effect instanceof KeyframeEffect) || effect.pseudoElement || !style) {
            throw fail(
              'preview_snapshot_animation_unsupported',
              'This composition contains an animation that cannot be frozen reliably. Open the fixed device preview to inspect it.',
            );
          }
          const properties = new Set(
            effect
              .getKeyframes()
              .flatMap((frame) =>
                Object.keys(frame).filter(
                  (property) =>
                    !['offset', 'computedOffset', 'easing', 'composite'].includes(property),
                ),
              ),
          );
          if (properties.size > 128) {
            throw fail(
              'preview_snapshot_animation_unsupported',
              'The animation snapshot exceeds its property budget.',
            );
          }
          properties.forEach((property) => {
            const cssName = property
              .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
              .replace(/^(webkit|moz|ms|o)-/, '-$1-');
            const value = computed.getPropertyValue(cssName);
            if (!value || value.length > limits.style) {
              throw fail(
                'preview_snapshot_animation_unsupported',
                'An animated style cannot be frozen within the snapshot budget.',
              );
            }
            style.setProperty(cssName, value, 'important');
          });
          frozenAnimations += 1;
        }
        if (style.length) {
          copy.setAttribute(frozenAttribute, String(index));
          frozenRules.push(`[${frozenAttribute}="${index}"]{${style.cssText}}`);
        }
      }
      if (original instanceof HTMLCanvasElement) {
        try {
          const image = document.createElement('img');
          Array.from(copy.attributes).forEach((attribute) =>
            image.setAttribute(attribute.name, attribute.value),
          );
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
          Array.from(copy.attributes).forEach((attribute) =>
            placeholder.setAttribute(attribute.name, attribute.value),
          );
          const bounds = original.getBoundingClientRect();
          placeholder.textContent = 'Canvas unavailable in screenshot';
          placeholder.style.cssText = `width:${bounds.width}px;height:${bounds.height}px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#4b5563;font:14px sans-serif`;
          copy.replaceWith(placeholder);
        }
      } else if (
        (captureLoadedImages || stable) &&
        original instanceof HTMLImageElement &&
        copy instanceof HTMLImageElement
      ) {
        freezeImage(original, copy);
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
    if (stable) {
      // The first layer wins important declarations, including against author
      // stylesheet layers. Suppress completed/delayed animations and pseudos too.
      const stylesheet = document.createElement('style');
      stylesheet.textContent =
        `@layer builder_snapshot_${token.replace(/-/g, '_')} {*,*::before,*::after,*::marker{animation:none!important;transition:none!important}${frozenRules.join('')}}`.replace(
          /</g,
          '\\3c ',
        );
      (clone.querySelector('head') ?? clone).prepend(stylesheet);
      [clone, ...Array.from(clone.querySelectorAll('*'))].forEach((copy) => {
        if (!copy.hasAttribute('style')) {
          copy.setAttribute(sourceUnstyledAttribute, '');
        }
      });
    }
    const html = `<!doctype html>${clone.outerHTML}`;
    if (html.length > limits.screenshotDocument) {
      throw fail(
        'preview_screenshot_failed',
        'The preview document exceeds the screenshot size limit.',
      );
    }
    return {
      html,
      ...(stable ? { sourceUnstyledAttribute } : {}),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      warnings: [
        ...(frozenAnimations
          ? [
              `${frozenAnimations} CSS animation${frozenAnimations === 1 ? ' was' : 's were'} frozen at the observed style values.`,
            ]
          : []),
        ...(unavailableCanvases
          ? [
              `${unavailableCanvases} canvas${unavailableCanvases === 1 ? ' was' : 'es were'} replaced in the screenshot because its pixels could not be read.`,
            ]
          : []),
        ...(frozenImages
          ? [
              `${frozenImages} loaded image${frozenImages === 1 ? ' was' : 's were'} frozen as a readable bitmap; animation is captured at one instant.`,
            ]
          : []),
        ...(omittedImages
          ? [
              `${omittedImages} image${omittedImages === 1 ? ' was' : 's were'} omitted because loaded pixels were unavailable or exceeded the bitmap budget.`,
            ]
          : []),
        ...(limitedImages
          ? [
              `${limitedImages} image${limitedImages === 1 ? '' : 's'} exceeded the snapshot bitmap limits.`,
            ]
          : []),
      ],
    };
  };
  const artifactMarker = (element: Element) => {
    if (!artifactDocument) {
      return element.getAttribute(editMarkerAttribute);
    }
    if (!document.body.contains(element)) {
      return null;
    }
    const existing = artifactMarkers.get(element);
    if (existing) {
      artifactElements.set(existing, element);
      return existing;
    }
    const ancestry: string[] = [];
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== document.body && ancestry.length < 5) {
      ancestry.push(
        `${ancestor.tagName.toLowerCase()}#${ancestor.id.slice(0, 64)}[${(ancestor.getAttribute('name') ?? '').slice(0, 64)}]`,
      );
      ancestor = ancestor.parentElement;
    }
    let directText = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent ?? '';
        if (directText.length >= 256) {
          break;
        }
      }
    }
    const id = element.id.slice(0, 128);
    const baseFingerprint = id
      ? `${element.tagName.toLowerCase()}|id|${id}`
      : [
          element.tagName.toLowerCase(),
          (element.getAttribute('name') ?? '').slice(0, 128),
          (element.getAttribute('role') ?? '').slice(0, 64),
          (element.getAttribute('aria-label') ?? '').slice(0, 128),
          directText.replace(/\s+/g, ' ').trim().slice(0, 256),
          ancestry.join('/'),
        ].join('|');
    const freeSlots = artifactFingerprintFreeSlots.get(baseFingerprint);
    const reusableOccurrence =
      !id && freeSlots && freeSlots.head < freeSlots.slots.length
        ? freeSlots.slots[freeSlots.head]
        : undefined;
    if (reusableOccurrence !== undefined && freeSlots) {
      freeSlots.head += 1;
      if (freeSlots.head >= freeSlots.slots.length) {
        artifactFingerprintFreeSlots.delete(baseFingerprint);
      } else if (freeSlots.head >= 256 && freeSlots.head * 2 >= freeSlots.slots.length) {
        freeSlots.slots = freeSlots.slots.slice(freeSlots.head);
        freeSlots.head = 0;
      }
    }
    const occurrence = id
      ? 0
      : (reusableOccurrence ?? artifactFingerprintCounts.get(baseFingerprint) ?? 0);
    const fingerprint = id ? baseFingerprint : `${baseFingerprint}|occurrence:${occurrence}`;
    if (!id && reusableOccurrence === undefined) {
      artifactFingerprintCounts.set(baseFingerprint, occurrence + 1);
    }
    const duplicate = artifactFingerprints.get(fingerprint);
    if (duplicate && duplicate !== element && duplicate.isConnected) {
      return null;
    }
    let firstHash = 0x811c9dc5;
    let secondHash = 0x9e3779b9;
    for (let index = 0; index < fingerprint.length; index += 1) {
      const code = fingerprint.charCodeAt(index);
      firstHash = Math.imul(firstHash ^ code, 0x01000193);
      secondHash = Math.imul(secondHash ^ code, 0x85ebca6b);
    }
    const marker = `artifact-element-${(firstHash >>> 0).toString(16)}${(secondHash >>> 0).toString(16)}`;
    const collision = artifactElements.get(marker);
    if (collision && collision !== element && collision.isConnected) {
      return null;
    }
    artifactMarkers.set(element, marker);
    artifactElementFingerprints.set(element, fingerprint);
    artifactElementIdentities.set(element, { baseFingerprint, occurrence, reusable: !id });
    artifactElements.set(marker, element);
    artifactFingerprints.set(fingerprint, element);
    if (!id) {
      artifactFingerprintActiveCounts.set(
        baseFingerprint,
        (artifactFingerprintActiveCounts.get(baseFingerprint) ?? 0) + 1,
      );
    }
    return marker;
  };
  const artifactSelectionCandidates = (root: ParentNode): Element[] => {
    const descendants = Array.from(root.querySelectorAll('*'));
    return root instanceof Element ? [root, ...descendants] : descendants;
  };
  const prepareArtifactSelectionTargets = (root: ParentNode = document.body) => {
    if (!artifactDocument || !document.body) {
      return [];
    }
    const prepared: Element[] = [];
    artifactSelectionCandidates(root).forEach((element) => {
      if (
        !element.closest('script,style,noscript,template') &&
        !element.hasAttribute('data-builder-inline-control')
      ) {
        if (artifactMarker(element)) {
          prepared.push(element);
        }
      }
    });
    return prepared;
  };
  const releaseArtifactSelectionTargets = (root: ParentNode) => {
    artifactSelectionCandidates(root).forEach((element) => {
      if (element.isConnected) {
        return;
      }
      const marker = artifactMarkers.get(element);
      if (marker && artifactElements.get(marker) === element) {
        artifactElements.delete(marker);
      }
      const fingerprint = artifactElementFingerprints.get(element);
      if (fingerprint && artifactFingerprints.get(fingerprint) === element) {
        artifactFingerprints.delete(fingerprint);
      }
      const identity = artifactElementIdentities.get(element);
      if (identity?.reusable) {
        const activeCount = Math.max(
          0,
          (artifactFingerprintActiveCounts.get(identity.baseFingerprint) ?? 1) - 1,
        );
        if (!activeCount) {
          artifactFingerprintActiveCounts.delete(identity.baseFingerprint);
          artifactFingerprintCounts.delete(identity.baseFingerprint);
          artifactFingerprintFreeSlots.delete(identity.baseFingerprint);
        } else {
          artifactFingerprintActiveCounts.set(identity.baseFingerprint, activeCount);
          const freeSlots = artifactFingerprintFreeSlots.get(identity.baseFingerprint) ?? {
            slots: [],
            head: 0,
          };
          freeSlots.slots.push(identity.occurrence);
          artifactFingerprintFreeSlots.set(identity.baseFingerprint, freeSlots);
        }
      }
      artifactMarkers.delete(element);
      artifactElementFingerprints.delete(element);
      artifactElementIdentities.delete(element);
    });
  };
  const context = (element: Element) => {
    const marker = artifactMarker(element)?.slice(0, limits.target) ?? null;
    const source = parseSource(marker);
    if (!marker || source.truncated || (!artifactDocument && !source.source)) {
      return null;
    }
    return {
      id: marker,
      label:
        bounded(
          element.getAttribute('aria-label') ||
            visibleText(element) ||
            element.tagName.toLowerCase(),
          120,
        ).text || element.tagName.toLowerCase(),
      data: {
        tagName: element.tagName.toLowerCase(),
        marker,
        ...(source.source ? { source: source.source } : {}),
      },
    };
  };
  const navigateForm = (form: HTMLFormElement, submitter?: HTMLElement) => {
    if (form.method.toLowerCase() !== 'get') {
      send({
        type: 'runtime-error',
        message: `Preview form method ${form.method.toUpperCase()} is not supported; use a GET form for virtual navigation.`,
      });
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
    send({ type: 'navigate', url: destination.href });
  };

  type ActiveInlineEdit = {
    editId: number;
    element: Element;
    marker: string;
    tagName: string;
    original: Text;
    editor: HTMLSpanElement;
    pending: boolean;
  };
  let activeInlineEdit: ActiveInlineEdit | null = null;
  let pendingInlineTextAdmission: {
    id: number;
    element: Element;
    text: Text;
    base: string;
    marker: string;
    generation: number;
    timeout: number;
  } | null = null;
  let nextAdmissionId = 0;
  let localEditGeneration = 0;
  let localDocumentChanged = false;
  const reportInlineEdit = () => {
    if (!canvasNavigation) {
      return;
    }
    const bounds = activeInlineEdit?.editor.getBoundingClientRect();
    const x = bounds ? Math.max(0, Math.min(window.innerWidth, bounds.left)) : 0;
    const y = bounds ? Math.max(0, Math.min(window.innerHeight, bounds.top)) : 0;
    send({
      type: 'canvas-input',
      input: {
        kind: 'inline-edit',
        box: bounds
          ? {
              x,
              y,
              width: Math.max(0, Math.min(window.innerWidth, bounds.right) - x),
              height: Math.max(0, Math.min(window.innerHeight, bounds.bottom) - y),
            }
          : null,
      },
    });
  };
  if (canvasNavigation) {
    document.addEventListener(
      'wheel',
      (event) => {
        const zoom = event.ctrlKey || event.metaKey;
        if (!zoom && !canvasPanning) {
          return;
        }
        if (!zoom && event.target instanceof Element) {
          let control: Element | null = event.target.closest(
            '[contenteditable],input,textarea,select,[role="dialog"]',
          );
          while (control) {
            const style = getComputedStyle(control);
            const vertical =
              /(auto|scroll)/.test(style.overflowY) &&
              ((event.deltaY > 0 &&
                control.scrollTop + control.clientHeight < control.scrollHeight) ||
                (event.deltaY < 0 && control.scrollTop > 0));
            const horizontal =
              /(auto|scroll)/.test(style.overflowX) &&
              (style.direction === 'rtl'
                ? (event.deltaX > 0 && control.scrollLeft < 0) ||
                  (event.deltaX < 0 &&
                    control.scrollLeft > -(control.scrollWidth - control.clientWidth))
                : (event.deltaX > 0 &&
                    control.scrollLeft + control.clientWidth < control.scrollWidth) ||
                  (event.deltaX < 0 && control.scrollLeft > 0));
            if (vertical || horizontal || control instanceof HTMLSelectElement) {
              return;
            }
            control =
              control.parentElement?.closest(
                '[contenteditable],input,textarea,select,[role="dialog"]',
              ) ?? null;
          }
        }
        if (!zoom && (!canvasCommitted || !event.isTrusted)) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        send({
          type: 'canvas-input',
          input: zoom
            ? {
                kind: 'zoom',
                x: event.clientX,
                y: event.clientY,
                deltaY: event.deltaY,
                deltaMode: event.deltaMode,
              }
            : {
                kind: 'pan',
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaMode: event.deltaMode,
              },
        });
      },
      { capture: true, passive: false },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          if (activeInlineEdit && !event.isTrusted) {
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          if (activeInlineEdit?.pending) {
            announceInlineEdit('This edit is being applied. Wait before cancelling.', true);
          } else if (activeInlineEdit || pendingInlineTextAdmission) {
            cancelInlineEdit();
          } else {
            send({
              type: 'canvas-input',
              input: { kind: 'escape', ...(event.isTrusted ? { interactionTime } : {}) },
            });
          }
        }
      },
      true,
    );
  }
  let pendingImageEdit: {
    editId: number;
    element: HTMLImageElement;
    previousOutline: string;
  } | null = null;
  let hoveredInlineElement: HTMLElement | null = null;
  let previousHoverOutline = '';
  let nextInlineEditId = 0;
  let inlineModeGeneration = 0;
  let allowBlurCommit = false;
  const inlineTabStops = new Map<HTMLElement, string | null>();
  const clearInlineHover = () => {
    if (hoveredInlineElement) {
      hoveredInlineElement.style.outline = previousHoverOutline;
      hoveredInlineElement = null;
      previousHoverOutline = '';
    }
  };
  const directEditableText = (element: Element) =>
    Array.from(element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
    ) as Text | undefined;
  const announceInlineEdit = (message: string, failed = false) => {
    const notice = document.createElement('div');
    notice.setAttribute('role', failed ? 'alert' : 'status');
    notice.setAttribute('data-builder-inline-notice', 'true');
    notice.textContent = message.slice(0, 500);
    notice.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:320px;padding:8px 12px;border-radius:8px;background:Canvas;color:CanvasText;border:1px solid Highlight;font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgb(0 0 0 / 20%)';
    document.body.appendChild(notice);
    localEditGeneration += 1;
    window.setTimeout(() => {
      notice.remove();
      localEditGeneration += 1;
    }, 3_000);
  };
  const cancelPendingInlineTextAdmission = () => {
    if (!pendingInlineTextAdmission) {
      return false;
    }
    clearTimeout(pendingInlineTextAdmission.timeout);
    pendingInlineTextAdmission = null;
    localEditGeneration += 1;
    reportInlineEdit();
    return true;
  };
  const cancelInlineEdit = () => {
    cancelPendingInlineTextAdmission();
    const active = activeInlineEdit;
    if (!active) {
      return;
    }
    active.editor.replaceWith(active.original);
    activeInlineEdit = null;
    localEditGeneration += 1;
    reportInlineEdit();
  };
  const commitInlineEdit = () => {
    const active = activeInlineEdit;
    if (!active || active.pending) {
      return;
    }
    const newText = active.editor.textContent ?? '';
    if (newText === active.original.data) {
      active.editor.replaceWith(active.original);
      activeInlineEdit = null;
      localEditGeneration += 1;
      reportInlineEdit();
      return;
    }
    if (newText.length > 4_096 || /[\r\n]/.test(newText)) {
      announceInlineEdit('Inline text must be one line under 4096 characters.', true);
      active.editor.focus();
      return;
    }
    active.pending = true;
    active.editor.contentEditable = 'false';
    send({
      type: 'inline-edit',
      edit: {
        kind: 'text',
        editId: active.editId,
        marker: active.marker,
        tagName: active.tagName,
        newText,
      },
    });
  };
  const beginInlineEdit = (element: Element, admitted = false) => {
    if (!canvasCommitted) {
      announceInlineEdit('Wait for this preview to finish loading before editing.', true);
      return;
    }
    const marker = element.getAttribute(editMarkerAttribute);
    const source = parseSource(marker);
    const text = directEditableText(element);
    if (!marker || !source.source || source.truncated || !text) {
      announceInlineEdit('This element does not have directly editable theme text.', true);
      return;
    }
    if (
      canvasNavigation &&
      (!(element instanceof HTMLElement) ||
        inlineTextTargets[marker] !== element.tagName.toLowerCase())
    ) {
      const selected = context(element);
      if (selected) {
        send({ type: 'select', selection: selected });
      }
      announceInlineEdit(
        'Inline editing requires literal template text. Select this dynamic output or unsupported markup to edit its source or settings.',
        true,
      );
      return;
    }
    if (canvasNavigation && !admitted) {
      if (pendingInlineTextAdmission) {
        return;
      }
      nextAdmissionId += 1;
      const id = nextAdmissionId;
      const timeout = window.setTimeout(() => {
        if (pendingInlineTextAdmission?.id === id) {
          pendingInlineTextAdmission = null;
          localEditGeneration += 1;
          reportInlineEdit();
          announceInlineEdit('The editor did not acknowledge this text edit. Try again.', true);
        }
      }, 5_000);
      pendingInlineTextAdmission = {
        id,
        element,
        text,
        base: text.data,
        marker,
        generation: inlineModeGeneration,
        timeout,
      };
      localEditGeneration += 1;
      send({ type: 'inline-text-admission', requestId: id });
      return;
    }
    nextInlineEditId += 1;
    const editor = document.createElement('span');
    editor.textContent = text.data;
    editor.contentEditable = 'plaintext-only';
    editor.spellcheck = true;
    editor.setAttribute('role', 'textbox');
    editor.setAttribute(
      'aria-label',
      `Edit ${bounded(visibleText(element), 120).text || element.tagName.toLowerCase()}`,
    );
    editor.style.outline = '2px solid Highlight';
    text.replaceWith(editor);
    activeInlineEdit = {
      editId: nextInlineEditId,
      element,
      marker,
      tagName: element.tagName.toLowerCase(),
      original: text,
      editor,
      pending: false,
    };
    localEditGeneration += 1;
    reportInlineEdit();
    editor.addEventListener(
      'keydown',
      (event) => {
        if (!event.isTrusted) {
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (canvasNavigation && activeInlineEdit?.pending) {
            announceInlineEdit('This edit is being applied. Wait before cancelling.', true);
          } else {
            cancelInlineEdit();
          }
        } else if (event.key === 'Enter') {
          event.preventDefault();
          event.stopImmediatePropagation();
          commitInlineEdit();
        } else if (event.key === 'Tab' && !canvasNavigation) {
          allowBlurCommit = true;
        }
      },
      true,
    );
    editor.addEventListener('blur', () => {
      if (canvasNavigation) {
        return;
      }
      if (allowBlurCommit) {
        allowBlurCommit = false;
        commitInlineEdit();
      } else {
        cancelInlineEdit();
      }
    });
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  const selectUnsupportedImage = (element: HTMLImageElement) => {
    if (inlineImageEditing) {
      return false;
    }
    const selected = context(element);
    if (selected) {
      send({ type: 'select', selection: selected });
    }
    announceInlineEdit(
      'Inline image replacement is unavailable here. Select the image to edit its source.',
    );
    return true;
  };
  const submitInlineImage = async (element: HTMLImageElement, file: File) => {
    if (selectUnsupportedImage(element)) {
      return;
    }
    if (!canvasCommitted) {
      announceInlineEdit('Wait for this preview to finish loading before editing.', true);
      return;
    }
    if (canvasNavigation && activeInlineEdit) {
      announceInlineEdit('Finish or cancel the current text edit first.', true);
      return;
    }
    if (!inlineEditing || pendingImageEdit) {
      announceInlineEdit('Finish the current image replacement first.', true);
      return;
    }
    if (element.closest('picture')?.querySelector('source')) {
      announceInlineEdit(
        'Responsive picture images are not editable inline yet. Ask Builder to update the picture sources instead.',
        true,
      );
      return;
    }
    const marker = element.getAttribute(editMarkerAttribute);
    const source = parseSource(marker);
    if (!marker || !source.source || source.truncated) {
      announceInlineEdit('This image does not have an editable theme source marker.', true);
      return;
    }
    if (
      !['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      announceInlineEdit('Use a GIF, JPEG, PNG, or WebP image under 5 MB.', true);
      return;
    }
    nextInlineEditId += 1;
    const editId = nextInlineEditId;
    const generation = inlineModeGeneration;
    const pending = { editId, element, previousOutline: element.style.outline };
    pendingImageEdit = pending;
    localEditGeneration += 1;
    element.style.outline = '2px solid Highlight';
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      if (!inlineEditing || generation !== inlineModeGeneration || pendingImageEdit !== pending) {
        element.style.outline = pending.previousOutline;
        if (pendingImageEdit === pending) {
          pendingImageEdit = null;
          localEditGeneration += 1;
        }
        return;
      }
      send({
        type: 'inline-edit',
        edit: {
          kind: 'image',
          editId,
          marker,
          tagName: 'img',
          fileName: file.name.slice(0, 255),
          mediaType: file.type,
          data,
        },
      });
    } catch (error) {
      element.style.outline = pending.previousOutline;
      if (pendingImageEdit === pending) {
        pendingImageEdit = null;
        localEditGeneration += 1;
      }
      announceInlineEdit(
        error instanceof Error ? error.message : 'The image could not be read.',
        true,
      );
    }
  };
  const imagePicker = document.createElement('input');
  imagePicker.type = 'file';
  imagePicker.accept = 'image/gif,image/jpeg,image/png,image/webp';
  imagePicker.hidden = true;
  imagePicker.setAttribute('data-builder-inline-control', 'true');
  imagePicker.setAttribute('data-testid', 'builder-inline-image-input');
  document.documentElement.appendChild(imagePicker);
  let imagePickerTarget: HTMLImageElement | null = null;
  imagePicker.addEventListener('change', () => {
    const file = imagePicker.files?.[0];
    const target = imagePickerTarget;
    imagePicker.value = '';
    imagePickerTarget = null;
    if (file && target) {
      void submitInlineImage(target, file);
    }
  });
  const beginInlineImage = (element: HTMLImageElement) => {
    if (selectUnsupportedImage(element)) {
      return;
    }
    if (!canvasCommitted) {
      announceInlineEdit('Wait for this preview to finish loading before editing.', true);
      return;
    }
    if (canvasNavigation && activeInlineEdit) {
      announceInlineEdit('Finish or cancel the current text edit first.', true);
      return;
    }
    if (pendingImageEdit) {
      announceInlineEdit('Finish the current image replacement first.', true);
      return;
    }
    if (element.closest('picture')?.querySelector('source')) {
      announceInlineEdit(
        'Responsive picture images are not editable inline yet. Ask Builder to update the picture sources instead.',
        true,
      );
      return;
    }
    imagePickerTarget = element;
    imagePicker.click();
  };
  const selectionTargets = (): HTMLElement[] =>
    artifactDocument
      ? Array.from(document.body?.querySelectorAll<HTMLElement>('*') ?? []).filter(
          (element) =>
            !element.closest('script,style,noscript,template') &&
            !element.hasAttribute('data-builder-inline-control') &&
            Boolean(artifactMarker(element)),
        )
      : Array.from(document.querySelectorAll<HTMLElement>(`[${editMarkerAttribute}]`));
  const selectionTarget = (element: Element | null): Element | null => {
    if (!element) {
      return null;
    }
    if (artifactDocument) {
      return document.body.contains(element) &&
        !element.closest('script,style,noscript,template') &&
        artifactMarker(element)
        ? element
        : null;
    }
    return element.closest(`[${editMarkerAttribute}]`);
  };
  const addSourceTabStops = () => {
    selectionTargets().forEach((element) => {
      const naturallyFocusable = element.matches(
        'a[href],button,input,select,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]',
      );
      if (!naturallyFocusable && !inlineTabStops.has(element)) {
        inlineTabStops.set(element, element.getAttribute('tabindex'));
        element.tabIndex = 0;
      }
    });
  };
  const clearSourceTabStops = () => {
    inlineTabStops.forEach((tabIndex, element) => {
      if (tabIndex === null) {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', tabIndex);
      }
    });
    inlineTabStops.clear();
  };
  const setInlineEditMode = (enabled: boolean) => {
    inlineModeGeneration += 1;
    inlineEditing = enabled;
    if (enabled) {
      selectionMode = false;
      document.documentElement.dataset.selectionMode = 'off';
    }
    document.documentElement.dataset.inlineEditMode = enabled ? 'on' : 'off';
    if (enabled) {
      addSourceTabStops();
    } else {
      cancelInlineEdit();
      clearInlineHover();
      imagePickerTarget = null;
      imagePicker.value = '';
      if (pendingImageEdit) {
        pendingImageEdit.element.style.outline = pendingImageEdit.previousOutline;
        pendingImageEdit = null;
        localEditGeneration += 1;
      }
      if (!selectionMode) {
        clearSourceTabStops();
      }
    }
  };
  const setSelectionMode = (enabled: boolean) => {
    selectionMode = enabled;
    document.documentElement.dataset.selectionMode = enabled ? 'on' : 'off';
    if (enabled) {
      prepareArtifactSelectionTargets();
    }
    if (enabled && inlineEditing) {
      setInlineEditMode(false);
      addSourceTabStops();
    } else if (enabled) {
      addSourceTabStops();
    } else if (!enabled) {
      clearInlineHover();
      if (!inlineEditing) {
        clearSourceTabStops();
      }
    }
  };
  const setInteractionMode = (mode: 'browse' | 'select' | 'edit') => {
    setInlineEditMode(mode === 'edit');
    setSelectionMode(mode === 'select');
  };
  const handleInlineEditResult = (message: {
    editId?: unknown;
    ok?: unknown;
    message?: unknown;
  }) => {
    if (!Number.isSafeInteger(message.editId) || typeof message.ok !== 'boolean') {
      return;
    }
    const pending = pendingImageEdit;
    if (pending && pending.editId === message.editId) {
      pendingImageEdit = null;
      localEditGeneration += 1;
      localDocumentChanged ||= message.ok;
      pending.element.style.outline = pending.previousOutline;
      if (!message.ok) {
        announceInlineEdit(
          typeof message.message === 'string'
            ? message.message.slice(0, 500)
            : 'The image could not be replaced.',
          true,
        );
      } else {
        announceInlineEdit('Preview image updated.');
      }
      return;
    }
    const active = activeInlineEdit;
    if (!active || !active.pending || message.editId !== active.editId) {
      return;
    }
    if (!message.ok) {
      const error =
        typeof message.message === 'string'
          ? message.message.slice(0, 500)
          : 'The inline edit could not be applied.';
      if (canvasNavigation) {
        active.pending = false;
        active.editor.contentEditable = 'plaintext-only';
      } else {
        active.editor.replaceWith(active.original);
        activeInlineEdit = null;
        localEditGeneration += 1;
      }
      announceInlineEdit(error, true);
      return;
    }
    active.editor.replaceWith(document.createTextNode(active.editor.textContent ?? ''));
    activeInlineEdit = null;
    localEditGeneration += 1;
    localDocumentChanged = true;
    reportInlineEdit();
    announceInlineEdit('Preview text updated.');
  };

  setInlineEditMode(inlineEditing);
  setSelectionMode(selectionMode);
  window.addEventListener(
    'pointerover',
    (event) => {
      if (
        (!inlineEditing && !selectionMode) ||
        activeInlineEdit ||
        !(event.target instanceof Element)
      ) {
        return;
      }
      const editable = selectionTarget(event.target) as HTMLElement | null;
      if (
        !editable ||
        (inlineEditing &&
          !(editable instanceof HTMLImageElement) &&
          !directEditableText(editable)) ||
        editable === hoveredInlineElement
      ) {
        return;
      }
      clearInlineHover();
      hoveredInlineElement = editable;
      previousHoverOutline = editable.style.outline;
      editable.style.outline = '2px solid Highlight';
    },
    true,
  );
  window.addEventListener(
    'pointerout',
    (event) => {
      if (event.target === hoveredInlineElement) {
        clearInlineHover();
      }
    },
    true,
  );
  window.addEventListener(
    'dragover',
    (event) => {
      if (
        inlineEditing &&
        event.target instanceof HTMLImageElement &&
        event.dataTransfer?.types.includes('Files')
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    true,
  );
  window.addEventListener(
    'drop',
    (event) => {
      if (!event.isTrusted || !inlineEditing || !(event.target instanceof HTMLImageElement)) {
        return;
      }
      const file = event.dataTransfer?.files[0];
      if (!file) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      void submitInlineImage(event.target, file);
    },
    true,
  );
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (
        event.isTrusted &&
        activeInlineEdit &&
        !canvasNavigation &&
        event.target instanceof Node &&
        !activeInlineEdit.element.contains(event.target)
      ) {
        allowBlurCommit = true;
      }
    },
    true,
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (
        !event.isTrusted ||
        (!inlineEditing && !selectionMode) ||
        activeInlineEdit ||
        !['Enter', ' '].includes(event.key) ||
        !(event.target instanceof Element)
      ) {
        return;
      }
      const editable = selectionTarget(event.target);
      if (!editable) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      clearInlineHover();
      if (selectionMode) {
        const selection = context(editable);
        if (selection) {
          send({ type: 'select', selection });
        }
        return;
      }
      if (editable instanceof HTMLImageElement) {
        beginInlineImage(editable);
      } else {
        beginInlineEdit(editable);
      }
    },
    true,
  );

  window.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const editable = selectionTarget(target);
      if (event.isTrusted && inlineEditing && editable) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearInlineHover();
        if (canvasNavigation && !activeInlineEdit && event.detail < 2) {
          const selected = context(editable);
          if (selected) {
            send({ type: 'select', selection: selected });
          }
          return;
        }
        if (editable instanceof HTMLImageElement) {
          beginInlineImage(editable);
        } else if (!activeInlineEdit) {
          beginInlineEdit(editable);
        } else if (!activeInlineEdit.element.contains(target)) {
          if (canvasNavigation) {
            announceInlineEdit('Finish or cancel the current text edit first.', true);
          } else {
            commitInlineEdit();
          }
        }
        return;
      }
      const selection = selectionMode && editable ? context(editable) : null;
      if (event.isTrusted && selection) {
        event.preventDefault();
        event.stopImmediatePropagation();
        send({ type: 'select', selection });
        return;
      }
      const submitter = target?.closest(
        'button[type="submit"],button:not([type]),input[type="submit"],input[type="image"]',
      ) as HTMLButtonElement | HTMLInputElement | null;
      if (submitter?.form && !nativeForms) {
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateForm(submitter.form, submitter);
        return;
      }
      const anchor = target?.closest('a[href]');
      if (anchor && (!artifactDocument || event.isTrusted)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        send({ type: 'navigate', url: (anchor as HTMLAnchorElement).href });
      }
    },
    true,
  );
  window.addEventListener(
    'submit',
    (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) {
        return;
      }
      if (nativeForms) {
        if (event.isTrusted) {
          send({ type: 'native-form-submit' });
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const submitter =
        event instanceof SubmitEvent && event.submitter instanceof HTMLElement
          ? event.submitter
          : undefined;
      navigateForm(form, submitter);
    },
    true,
  );
  window.addEventListener(
    'keydown',
    (event) => {
      const control =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
          ? event.target
          : null;
      if (event.key !== 'Enter' || !control?.form || nativeForms) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateForm(control.form);
    },
    true,
  );
  window.addEventListener('error', (event) =>
    send({
      type: 'runtime-error',
      message: String(event.message || 'Preview script failed').slice(0, 2_000),
    }),
  );
  window.addEventListener('unhandledrejection', (event) =>
    send({
      type: 'runtime-error',
      message: String(
        (event.reason as Error)?.message || event.reason || 'Unhandled preview rejection',
      ).slice(0, 2_000),
    }),
  );
  window.addEventListener('load', () => send({ type: 'loaded' }), { once: true });
  const handleCommand = (event: MessageEvent<unknown>) => {
    const message = event.data as {
      channel?: unknown;
      documentId?: unknown;
      type?: unknown;
      requestId?: unknown;
      command?: unknown;
      payload?: unknown;
      allowed?: unknown;
    };
    if (message.channel !== channel || message.documentId !== documentId) {
      return;
    }
    if (message.type === 'canvas-committed' && canvasNavigation) {
      canvasCommitted = true;
      return;
    }
    if (message.type === 'inline-text-admission-result') {
      const pending = pendingInlineTextAdmission;
      if (!pending || message.requestId !== pending.id) {
        if (message.allowed === true && !pending && !activeInlineEdit) {
          reportInlineEdit();
        }
        return;
      }
      clearTimeout(pending.timeout);
      pendingInlineTextAdmission = null;
      localEditGeneration += 1;
      if (
        message.allowed === true &&
        inlineEditing &&
        canvasCommitted &&
        pending.generation === inlineModeGeneration &&
        pending.element.isConnected &&
        pending.element.getAttribute(editMarkerAttribute) === pending.marker &&
        directEditableText(pending.element) === pending.text &&
        pending.text.data === pending.base &&
        pending.element.getBoundingClientRect().width > 0 &&
        pending.element.getBoundingClientRect().height > 0 &&
        pending.element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
        !activeInlineEdit &&
        !pendingImageEdit
      ) {
        beginInlineEdit(pending.element, true);
      } else {
        reportInlineEdit();
        if (message.allowed !== true) {
          announceInlineEdit('Finish or cancel the current text draft first.', true);
        }
      }
      return;
    }
    if (message.type === 'inline-edit-result') {
      handleInlineEditResult(message as { editId?: unknown; ok?: unknown; message?: unknown });
      return;
    }
    if (
      message.type !== 'command' ||
      !Number.isInteger(message.requestId) ||
      ![
        'inspect-page',
        'measure-layout',
        'inspect-element',
        'screenshot',
        'set-inline-edit-mode',
        'cancel-inline-text-edit',
        'cancel-inline-text-admission',
        'set-selection-mode',
        'set-interaction-mode',
      ].includes(String(message.command))
    ) {
      return;
    }
    try {
      let result: unknown;
      if (message.command === 'inspect-page') {
        result = inspectPage();
      } else if (message.command === 'measure-layout') {
        result = {
          localEdits: {
            generation: localEditGeneration,
            active: Boolean(activeInlineEdit || pendingImageEdit || pendingInlineTextAdmission),
            changed:
              localDocumentChanged ||
              Boolean(document.querySelector('[data-builder-inline-notice]')),
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
          document: {
            width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
          },
        };
      } else if (message.command === 'inspect-element') {
        result = inspectElement(message.payload as { marker?: unknown; selector?: unknown });
      } else if (message.command === 'screenshot') {
        result = screenshotSnapshot((message.payload as { stable?: unknown })?.stable === true);
      } else if (message.command === 'cancel-inline-text-admission') {
        result = cancelPendingInlineTextAdmission();
      } else if (message.command === 'cancel-inline-text-edit') {
        if (activeInlineEdit?.pending) {
          throw fail(
            'inline_edit_pending',
            'This edit is being applied. Wait for its actual outcome before cancelling.',
          );
        }
        cancelInlineEdit();
        result = true;
      } else if (message.command === 'set-inline-edit-mode') {
        const enabled = Boolean((message.payload as { enabled?: unknown })?.enabled);
        setInlineEditMode(enabled);
        result = true;
      } else if (message.command === 'set-selection-mode') {
        const enabled = Boolean((message.payload as { enabled?: unknown })?.enabled);
        setSelectionMode(enabled);
        result = true;
      } else {
        const mode = (message.payload as { mode?: unknown })?.mode;
        if (!['browse', 'select', 'edit'].includes(String(mode))) {
          throw fail(
            'invalid_preview_interaction_mode',
            'The preview interaction mode is invalid.',
          );
        }
        setInteractionMode(mode as 'browse' | 'select' | 'edit');
        result = true;
      }
      portPostMessage({
        channel,
        documentId,
        type: 'command-result',
        requestId: message.requestId,
        ok: true,
        result,
      });
    } catch (cause) {
      const error = cause as Error & { code?: string };
      portPostMessage({
        channel,
        documentId,
        type: 'command-result',
        requestId: message.requestId,
        ok: false,
        error: {
          code:
            error.code ||
            (message.command === 'screenshot'
              ? 'preview_screenshot_failed'
              : 'preview_inspection_failed'),
          message: String(error.message || error).slice(0, 2_000),
        },
      });
    }
  };
  portAddEventListener('message', handleCommand as EventListener);
  portStart();
  parentPostMessage({ channel, documentId, type: 'command-port' }, '*', [commandChannel.port2]);

  const ready = () => {
    prepareArtifactSelectionTargets();
    if (artifactDocument && document.body) {
      new MutationObserver((records) => {
        records.forEach((record) => {
          record.removedNodes.forEach((node) => {
            if (node instanceof Element) {
              releaseArtifactSelectionTargets(node);
            }
          });
          record.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              prepareArtifactSelectionTargets(node);
            }
          });
        });
        if (selectionMode) {
          addSourceTabStops();
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (inlineEditing) {
      setInlineEditMode(true);
    }
    const selected = selectedId
      ? (artifactElements.get(selectedId) ??
        Array.from(document.querySelectorAll(`[${editMarkerAttribute}]`)).find(
          (element) => element.getAttribute(editMarkerAttribute) === selectedId,
        ))
      : null;
    send({ type: 'ready', selection: selected ? context(selected) : null });
  };
  runtimeScript?.remove();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
}
