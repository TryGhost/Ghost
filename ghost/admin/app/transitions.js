export default function () {
    this.transition(
        this.hasClass('fullscreen-modal-container'),
        this.toValue(true),
        this.use('fade', {duration: 150}),
        this.reverse('explode', {
            pick: '.fullscreen-modal',
            use: ['fade', {duration: 80}]
        }, {
            use: ['fade', {duration: 150}]
        })
    );

    this.transition(
        this.hasClass('fade-transition'),
        this.use('crossFade', {duration: 100})
    );
}
