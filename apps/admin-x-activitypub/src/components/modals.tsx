import ViewFollowers from './profile/ViewFollowersModal';
import ViewFollowing from './profile/ViewFollowingModal';
import {ModalComponent} from '@tryghost/admin-x-framework/routing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modals = {ViewFollowing, ViewFollowers} satisfies {[key: string]: ModalComponent<any>};

export default modals;

export type ModalName = keyof typeof modals;
