import {ComponentProps} from 'react';
import {FormPage} from './components/pages/FormPage';
import {SuccessPage} from './components/pages/SuccessPage';

const Pages = {
    FormPage,
    SuccessPage
};

export type PageName = keyof typeof Pages;

type PageTypes = {
    [Name in PageName]: {
        name: Name;
        data: ComponentProps<(typeof Pages)[Name]>;
    };
};

export type Page = PageTypes[PageName];

export default Pages;
