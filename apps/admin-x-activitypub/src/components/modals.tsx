import FollowSite from './FollowSite';
import ViewFollowing from './ViewFollowing';
import {ModalComponent} from '@tryghost/admin-x-framework/routing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modals = {FollowSite, ViewFollowing} satisfies {[key: string]: ModalComponent<any>};

export default modals;

export type ModalName = keyof typeof modals;
