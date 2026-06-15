import {Component, type ReactNode} from 'react';
import {reportError} from '../log';

interface Props {
    children?: ReactNode;
    onError?: (error: unknown) => void;
}

interface State {
    failed: boolean;
}

/**
 * Renders nothing after a descendant throws — a broken feature must degrade
 * to "portal absent", never break the host page.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = {failed: false};

    static getDerivedStateFromError(): State {
        return {failed: true};
    }

    componentDidCatch(error: unknown): void {
        reportError(error);
        this.props.onError?.(error);
    }

    render(): ReactNode {
        return this.state.failed ? null : this.props.children;
    }
}
