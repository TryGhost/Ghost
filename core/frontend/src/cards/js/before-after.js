(function () {
    const beforeAfterCards = [...document.querySelectorAll('.kg-before-after-card')];

    for (let card of beforeAfterCards) {
        const isFullWidth = card.classList.contains('kg-width-full');
        const input = card.querySelector('input');
        const overlay = card.querySelector('.kg-before-after-card-image-before');
        const button = card.querySelector('.kg-before-after-card-slider-button');
        const images = [...card.querySelectorAll('img')];
        const smallestImageWidth = Math.min(
            ...images.map(img => parseInt(img.getAttribute('width')))
        );

        function updateSlider() {
            overlay.setAttribute('style', `width: ${input.value}%`);
            button.setAttribute('style', `left: calc(${input.value}% - 18px`);
        }

        function updateDimensions() {
            const containerWidth = parseInt(getComputedStyle(card).getPropertyValue('width'));
            const width = isFullWidth ? containerWidth : Math.min(smallestImageWidth, containerWidth);
            for (let image of images) {
                image.setAttribute('style', `width: ${width.toString()}px;`);
            }
        }

        input.addEventListener('input', function () {
            updateSlider();
        });

        window.addEventListener('resize', function () {
            updateDimensions();
        });

        updateDimensions();
        updateSlider();
    }
})();
