(function() {
    const toggleCardElements = document.getElementsByClassName("kg-toggle-card");

    const getToggleControl = function(headingElement) {
        if (headingElement.tagName === 'BUTTON') {
            return headingElement;
        }

        return headingElement.querySelector('button');
    };

    const setToggleState = function(parentElement, isOpen) {
        const headingElement = parentElement.querySelector('.kg-toggle-heading');
        const toggleElement = headingElement && getToggleControl(headingElement);
        const headingTextElement = headingElement && headingElement.querySelector('.kg-toggle-heading-text');
        const contentElement = parentElement.querySelector('.kg-toggle-content');

        parentElement.setAttribute('data-kg-toggle-state', isOpen ? 'open' : 'close');

        if (toggleElement) {
            if (!toggleElement.getAttribute('aria-label') && !toggleElement.getAttribute('aria-labelledby') && headingTextElement) {
                toggleElement.setAttribute('aria-label', headingTextElement.textContent.trim());
            }

            toggleElement.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        if (contentElement) {
            contentElement.hidden = !isOpen;
            contentElement.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
    };

    const toggleFn = function(event) {
        const targetElement = event.target;
        const parentElement = targetElement.closest('.kg-toggle-card');
        const headingElement = parentElement.querySelector('.kg-toggle-heading');
        const toggleElement = headingElement && getToggleControl(headingElement);
        const interactiveElement = targetElement.closest('a, button, input, select, textarea, label, summary, [role="button"], [role="link"]');

        if (interactiveElement && (!toggleElement || (interactiveElement !== toggleElement && !toggleElement.contains(interactiveElement)))) {
            return;
        }

        const isOpening = parentElement.getAttribute("data-kg-toggle-state") === 'close';

        setToggleState(parentElement, isOpening);
    };

    for (let i = 0; i < toggleCardElements.length; i++) {
        const toggleCardElement = toggleCardElements[i];
        const toggleHeadingElement = toggleCardElement.querySelector('.kg-toggle-heading');
        const toggleState = toggleCardElement.getAttribute("data-kg-toggle-state");

        if (!toggleHeadingElement) {
            continue;
        }

        setToggleState(toggleCardElement, toggleState !== 'close');
        toggleHeadingElement.addEventListener('click', toggleFn, false);
    }
})();
