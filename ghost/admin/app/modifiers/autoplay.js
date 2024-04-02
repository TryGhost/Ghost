import {modifier} from 'ember-modifier';

export default modifier((element) => {
    element.muted = true;
    element.play();
}, {eager: false});
