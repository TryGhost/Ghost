(function() {
    const toggleCardElements = document.getElementsByClassName("kg-toggle-card");

    const getToggleControl = function(headingElement) {
        if (headingElement.tagName === 'BUTTON') {
            return headingElement;
        }

        return headingElement.querySelector('button');
    };

    const setLegacyToggleState = function(parentElement, isOpen) {
        const headingElement = parentElement.querySelector('.kg-toggle-heading');
        const toggleElement = headingElement && getToggleControl(headingElement);
        const headingTextElement = headingElement && headingElement.querySelector('.kg-toggle-heading-text');
        const contentElement = parentElement.querySelector('.kg-toggle-content');

        parentElement.setAttribute('data-kg-toggle-state', isOpen ? 'open' : 'close');

        if (toggleElement) {
            const ariaLabel = toggleElement.getAttribute('aria-label');
            if ((!ariaLabel || ariaLabel === 'Expand toggle to read content') && !toggleElement.getAttribute('aria-labelledby') && headingTextElement && headingTextElement.textContent.trim()) {
                toggleElement.setAttribute('aria-label', headingTextElement.textContent.trim());
            }

            toggleElement.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        if (contentElement) {
            contentElement.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            contentElement.toggleAttribute('inert', !isOpen);
        }
    };

    const toggleFn = function(event) {
        const targetElement = event.target;
        const parentElement = targetElement.closest('.kg-toggle-card');

        // Native disclosure cards own their state and interaction behavior.
        if (!parentElement || parentElement.tagName === 'DETAILS') {
            return;
        }

        const headingElement = parentElement.querySelector('.kg-toggle-heading');
        const toggleElement = headingElement && getToggleControl(headingElement);
        const interactiveElement = targetElement.closest('a, button, input, select, textarea, label, summary, [role="button"], [role="link"]');

        if (interactiveElement && (!toggleElement || (interactiveElement !== toggleElement && !toggleElement.contains(interactiveElement)))) {
            return;
        }

        const isOpening = parentElement.getAttribute('data-kg-toggle-state') === 'close';
        setLegacyToggleState(parentElement, isOpening);
    };

    for (let i = 0; i < toggleCardElements.length; i++) {
        const toggleCardElement = toggleCardElements[i];

        if (toggleCardElement.tagName === 'DETAILS') {
            continue;
        }

        const toggleHeadingElement = toggleCardElement.querySelector('.kg-toggle-heading');
        const toggleState = toggleCardElement.getAttribute('data-kg-toggle-state');

        if (!toggleHeadingElement) {
            continue;
        }

        if (toggleState) {
            setLegacyToggleState(toggleCardElement, toggleState === 'open');
        }
        toggleHeadingElement.addEventListener('click', toggleFn, false);
    }
})();
