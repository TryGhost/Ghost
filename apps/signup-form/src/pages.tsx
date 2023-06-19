import React from 'react';
import {FormPage} from './components/pages/FormPage';
import {SuccessPage} from './components/pages/SuccessPage';

const Pages = {
    FormPage,
    SuccessPage
};

export type PageName = keyof typeof Pages;

type PageTypes = {
    [name in PageName]: {
        name: name,
        data: React.ComponentProps<typeof Pages[name]>
    }
}

export type Page = PageTypes[keyof PageTypes]

export default Pages;
