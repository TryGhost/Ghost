import AddNameDialog from './components/modals/AddNameDialog';
import ReportDialog from './components/modals/ReportDialog';

/** List of all available pages in Comments-UI, mapped to their UI component
 * Any new page added to comments-ui needs to be mapped here
*/
const Pages = {
    addNameDialog: AddNameDialog,
    reportDialog: ReportDialog
};
export default Pages;
