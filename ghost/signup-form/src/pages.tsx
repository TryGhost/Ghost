import React from 'react';
import {Form} from './components/pages/Form';
import {Success} from './components/pages/Success';

// When adding a new page, also add it at the bottom to the Page type (*)
const Pages = {
    form: Form,
    success: Success
};

// (*) Note we have repeated names here, and don't use PageName
// to make type checking work for the Page type, so we have type checks in place
// that we pass the right data to the right page (otherwise it will only check if
// the name is correct, and the data is correct for any page, not the specific page)
export type Page = PageType<'form'> | PageType<'success'>;

export type PageName = keyof typeof Pages;
export type PageType<Name extends PageName> = {
    name: Name;
    // get props of component
    data: React.ComponentProps<typeof Pages[Name]>;
}

export default Pages;
