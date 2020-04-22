import React from 'react';
import {render} from '@testing-library/react';
import PopupMenu from './PopupMenu';
import {site} from '../test/fixtures/data';

describe('Popup Menu', () => {
    test('renders', () => {
        const {getByTitle} = render(
            <PopupMenu data={{site}} page='signin' action={{}} onAction={() => {}} />
        );
        const popupFrame = getByTitle('membersjs-popup');

        expect(popupFrame).toBeInTheDocument();
    });
});
