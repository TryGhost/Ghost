import React from 'react';
import {FormPage} from './components/pages/FormPage';
import {SuccessPage} from './components/pages/SuccessPage';

// When adding a new page, also add it at the bottom to the Page type (*)
const Pages = {
    FormPage,
    SuccessPage
};

// (*) Note we have repeated names here, and don't use PageName
// to make type checking work for the Page type, so we have type checks in place
// that we pass the right data to the right page (otherwise it will only check if
// the name is correct, and the data is correct for any page, not the specific page)
export type Page = PageType<'FormPage'> | PageType<'SuccessPage'>;

export type PageName = keyof typeof Pages;
export type PageType<Name extends PageName> = {
    name: Name;
    // get props of component
    data: React.ComponentProps<typeof Pages[Name]>;
}

export default Pages;
