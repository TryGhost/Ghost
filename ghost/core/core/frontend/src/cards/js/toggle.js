(function() {
    const toggleHeadingElements = document.getElementsByClassName("kg-toggle-heading");

    const toggleFn = function(event) {
        const targetElement = event.target;
        const parentElement = targetElement.closest('.kg-toggle-card');
        var toggleState = parentElement.getAttribute("data-kg-toggle-state");
        if (toggleState === 'close') {
            parentElement.setAttribute('data-kg-toggle-state', 'open');
        } else {
            parentElement.setAttribute('data-kg-toggle-state', 'close');
        }
    };

    for (let i = 0; i < toggleHeadingElements.length; i++) {
        toggleHeadingElements[i].addEventListener('click', toggleFn, false);
    }
})();
