import type {ModalService} from './modal-service';
import type {NotificationService} from './notification-service';
import type {StateStore} from './state';
import type {I18nStore} from '../shared/i18n';
import type {Services, ModalOptions, ModalHandle, NotificationOptions, NotificationHandle} from '../types';
import type {ReactNode} from 'react';

/**
 * Builds the immutable services object passed to feature chunks at mount.
 *
 * Why a factory: features should not import these singletons directly — they
 * accept what they're given. That keeps tests trivial (pass fakes) and makes
 * cross-feature coupling visible at the call site.
 */
export function createServices(deps: {
    state: StateStore;
    modal: ModalService;
    notification: NotificationService;
    i18n: I18nStore;
}): Services {
    const {state, modal, notification, i18n} = deps;
    return {
        getState: () => state.get(),
        setMember: (member) => state.setMember(member),
        mergeSiteData: (data) => state.mergeSiteData(data),
        subscribe: (listener) => state.subscribe(listener),
        openModal: (content: ReactNode, options?: ModalOptions): ModalHandle => modal.open(content, options),
        showNotification: (options: NotificationOptions): NotificationHandle => notification.show(options),
        t: i18n.t,
        dir: () => i18n.dir()
    };
}
