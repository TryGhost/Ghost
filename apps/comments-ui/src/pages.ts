import AddDetailsPopup from './components/popups/add-details-popup';
import CTAPopup from './components/popups/cta-popup';
import DeletePopup from './components/popups/delete-popup';
import React from 'react';
import ReportPopup from './components/popups/report-popup';

/** List of all available pages in Comments-UI, mapped to their UI component
 * Any new page added to comments-ui needs to be mapped here
*/
export const Pages = {
    addDetailsPopup: AddDetailsPopup,
    reportPopup: ReportPopup,
    ctaPopup: CTAPopup,
    deletePopup: DeletePopup
};
export type PageName = keyof typeof Pages;

type PageTypes = {
    [name in PageName]: {
        type: name,
        /**
         * Called when closing the popup
         * @param succeeded False if normal cancel/close buttons are used
         */
        callback?: (succeeded: boolean) => void,
    } & React.ComponentProps<typeof Pages[name]>
}

export type Page = PageTypes[keyof PageTypes]
