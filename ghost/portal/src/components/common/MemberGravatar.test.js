import React from 'react';
import {render} from '@testing-library/react';
import MemberGravatar from './MemberGravatar';

const setup = (overrides = {}) => {
    const props = {
        gravatar: 'https://gravatar.com/avatar/76a4c5450dbb6fde8a293a811622aa6f?s=250&d=blank'
    };
    const utils = render(
        <MemberGravatar {...props} />
    );

    const figureEl = utils.container.querySelector('figure');
    const userIconEl = utils.container.querySelector('svg');
    const imgEl = utils.container.querySelector('img');
    return {
        figureEl,
        userIconEl,
        imgEl,
        ...utils
    };
};

describe('MemberGravatar', () => {
    test('renders', () => {
        const {figureEl, userIconEl, imgEl} = setup();
        expect(figureEl).toBeInTheDocument();
        expect(userIconEl).toBeInTheDocument();
        expect(imgEl).toBeInTheDocument();
    });
});
