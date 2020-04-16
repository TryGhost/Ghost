import React from 'react';
import {render} from '@testing-library/react';
import PopupMenuComponent from './PopupMenuComponent';
import {site} from '../test/fixtures/data';

describe('PopupMenuComponentTest', () => {
    test('renders', () => {
        const {getByTitle} = render(
            <PopupMenuComponent data={{site}} page='signin' action={{}} onAction={() => {}} />
        );
        const popupFrame = getByTitle('membersjs-popup');

        expect(popupFrame).toBeInTheDocument();
    });
});
