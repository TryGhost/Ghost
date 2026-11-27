// Ref: https://reactjs.org/docs/context.html
import React from 'react';

/** @type {{
 *   site: object,
 *   member: object | null,
 *   offers: unknown[],
 *   action: string,
 *   actionErrorMessage: string | null,
 *   lastPage: string,
 *   brandColor: string,
 *   pageData: object,
 *   doAction: (action: string, data: unknown) => unknown,
 *   dir: string,
 *   showPopup?: boolean,
 *   notification?: object | null,
 * }} */
const defaults = {
  site: {},
  member: {},
  offers: [],
  action: '',
  actionErrorMessage: null,
  lastPage: '',
  brandColor: '',
  pageData: {},
  doAction: (action, data) => {
    return { action, data };
  },
  dir: 'ltr',
};

const AppContext = React.createContext(defaults);

export default AppContext;
