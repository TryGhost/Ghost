import DemoModal from './DemoModal';
import {ModalComponent} from '@tryghost/admin-x-framework/routing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modals = {DemoModal} satisfies {[key: string]: ModalComponent<any>};

export default modals;

export type ModalName = keyof typeof modals;
