(function () {
  const toggleHeadingElements = document.getElementsByClassName('kg-toggle-heading');

  const syncAriaState = function (headingElement) {
    const parentElement = headingElement.closest('.kg-toggle-card');
    const contentElement = parentElement.querySelector('.kg-toggle-content');
    const buttonElement = headingElement.querySelector('.kg-toggle-card-icon');
    const isOpen = parentElement.getAttribute('data-kg-toggle-state') === 'open';

    if (buttonElement) {
      // Some older/hand-authored cards may be missing this label entirely.
      if (!buttonElement.hasAttribute('aria-label')) {
        buttonElement.setAttribute('aria-label', 'Expand toggle to read content');
      }
      buttonElement.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    if (contentElement) {
      // Prevents screen readers from reading/navigating into content that is
      // visually hidden (height: 0; overflow: hidden) while the toggle is closed.
      contentElement.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
  };

  const toggleFn = function (event) {
    const targetElement = event.target;
    const headingElement = targetElement.closest('.kg-toggle-heading');
    const parentElement = targetElement.closest('.kg-toggle-card');
    var toggleState = parentElement.getAttribute('data-kg-toggle-state');
    if (toggleState === 'close') {
      parentElement.setAttribute('data-kg-toggle-state', 'open');
    } else {
      parentElement.setAttribute('data-kg-toggle-state', 'close');
    }
    syncAriaState(headingElement);
  };

  for (let i = 0; i < toggleHeadingElements.length; i++) {
    toggleHeadingElements[i].addEventListener('click', toggleFn, false);
    // Reflect the initial (usually closed) state for screen readers on page load.
    syncAriaState(toggleHeadingElements[i]);
  }
})();
