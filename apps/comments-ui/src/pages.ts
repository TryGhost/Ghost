import AddDetailsPopup from './components/popups/AddDetailsPopup';
import React from 'react';
import ReportPopup from './components/popups/ReportPopup';

/** List of all available pages in Comments-UI, mapped to their UI component
 * Any new page added to comments-ui needs to be mapped here
*/
export const Pages = {
    addDetailsPopup: AddDetailsPopup,
    reportPopup: ReportPopup
};
export type PageName = keyof typeof Pages;

type PageTypes = {
    [name in PageName]: {
        type: name
    } & React.ComponentProps<typeof Pages[name]>
}

export type Page = PageTypes[keyof PageTypes]
