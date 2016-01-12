import { target } from 'liquid-tether';

export default function () {
    this.transition(
        target('fullscreen-modal'),
        this.toValue(({isVisible}) => isVisible),
        // this.use('tether', [modal options], [background options])
        this.use('tether', ['fade', {duration: 150}], ['fade', {duration: 150}]),
        this.reverse('tether', ['fade', {duration: 80}], ['fade', {duration: 150}])
    );
}
