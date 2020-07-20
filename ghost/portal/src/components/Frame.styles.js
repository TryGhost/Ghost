/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

import {ActionButtonStyles} from './common/ActionButton';
import {SwitchStyles} from './common/Switch';

// Append all styles as string which we want to pass to iframe
const FrameStyle = 
    SwitchStyles + 
    ActionButtonStyles;

export default FrameStyle;