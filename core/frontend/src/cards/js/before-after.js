(function () {
    const beforeAfterCards = [...document.querySelectorAll('.kg-before-after-card')];

    for (let card of beforeAfterCards) {
        const input = card.querySelector('input');
        const overlay = card.querySelector('.kg-before-after-card-image-before');
        const button = card.querySelector('.kg-before-after-card-slider-button');
        const images = [...card.querySelectorAll('img')];

        function updateSlider() {
            overlay.setAttribute('style', `width: ${input.value}%`);
            button.setAttribute('style', `left: calc(${input.value}% - 18px`);
        }

        function updateDimensions() {
            const imageWidth = getComputedStyle(images[0]).getPropertyValue('width');

            images[1].setAttribute('style', `width: ${imageWidth}`);
        }

        input.addEventListener('input', function () {
            updateSlider();
        });

        input.addEventListener('change', function () {
            input.blur();
        });

        window.addEventListener('resize', function () {
            updateDimensions();
        });

        updateDimensions();
        updateSlider();
    }
})();
