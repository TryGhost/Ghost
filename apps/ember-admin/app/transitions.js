export default function () {
    this.transition(
        this.hasClass('fullscreen-modal-container'),
        this.toValue(true),
        this.use('fade', {duration: 150}),
        this.reverse('fade', {duration: 150})
    );

    this.transition(
        this.hasClass('fade-transition'),
        this.use('crossFade', {duration: 100})
    );

    // TODO: Maybe animate with explode. gh-unsplash-window should ideally slide in from bottom to top of screen
    // this.transition(
    //     this.hasClass('gh-unsplash-window'),
    //     this.toValue(true),
    //     this.use('toUp', {duration: 500}),
    //     this.reverse('toDown', {duration: 500})
    // );
}
