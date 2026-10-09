import { FormPage } from './components/pages/form-page';
import { SuccessPage } from './components/pages/success-page';
import type { ComponentProps } from 'preact';

const Pages = {
  FormPage,
  SuccessPage,
};

export type PageName = keyof typeof Pages;

type PageTypes = {
  [name in PageName]: {
    name: name;
    data: ComponentProps<(typeof Pages)[name]>;
  };
};

export type Page = PageTypes[keyof PageTypes];

export default Pages;
