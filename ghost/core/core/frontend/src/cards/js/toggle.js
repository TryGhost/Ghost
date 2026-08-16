(function () {
    const toggleCards = document.querySelectorAll('.kg-toggle-card');

    const setExpandedState = function (card, isOpen) {
        const button = card.querySelector('.kg-toggle-card-icon');
        const content = card.querySelector('.kg-toggle-content');

        card.setAttribute('data-kg-toggle-state', isOpen ? 'open' : 'close');

        if (button) {
            button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

            // When aria-labelledby is present, aria-expanded conveys state with the heading name.
            // Otherwise keep a clear Expand/Collapse label for older markup.
            if (!button.getAttribute('aria-labelledby')) {
                button.setAttribute('aria-label', isOpen ? 'Collapse content' : 'Expand content');
            }
        }

        if (content) {
            if (isOpen) {
                content.removeAttribute('hidden');
                content.removeAttribute('aria-hidden');
                content.removeAttribute('inert');
            } else {
                // Use hidden so collapsed content is not exposed to assistive tech.
                // aria-hidden + inert cover older markup and browsers without full hidden support.
                content.setAttribute('hidden', '');
                content.setAttribute('aria-hidden', 'true');
                content.setAttribute('inert', '');
            }
        }
    };

    const toggleFn = function (event) {
        const targetElement = event.target;
        const parentElement = targetElement.closest('.kg-toggle-card');

        if (!parentElement) {
            return;
        }

        const isClosed = parentElement.getAttribute('data-kg-toggle-state') === 'close';
        setExpandedState(parentElement, isClosed);
    };

    for (let i = 0; i < toggleCards.length; i++) {
        const card = toggleCards[i];
        const heading = card.querySelector('.kg-toggle-heading');
        const button = card.querySelector('.kg-toggle-card-icon');
        const content = card.querySelector('.kg-toggle-content');
        const headingText = card.querySelector('.kg-toggle-heading-text');

        if (content) {
            const contentId = `kg-toggle-content-${i}`;
            content.id = contentId;

            if (button) {
                button.setAttribute('aria-controls', contentId);
                button.setAttribute('type', 'button');
            }
        }

        if (headingText && button) {
            const headingId = `kg-toggle-heading-${i}`;
            headingText.id = headingId;
            // Prefer the heading text as the accessible name so the control is announced
            // with the section title plus expanded/collapsed state via aria-expanded.
            button.setAttribute('aria-labelledby', headingId);
            button.removeAttribute('aria-label');
        }

        if (button) {
            const svg = button.querySelector('svg');
            if (svg) {
                svg.setAttribute('aria-hidden', 'true');
                svg.setAttribute('focusable', 'false');
            }
        }

        const isOpen = card.getAttribute('data-kg-toggle-state') === 'open';
        setExpandedState(card, isOpen);

        // Preserve mouse activation on the whole heading; keyboard users activate via the button.
        if (heading) {
            heading.addEventListener('click', toggleFn, false);
        }
    }
})();
