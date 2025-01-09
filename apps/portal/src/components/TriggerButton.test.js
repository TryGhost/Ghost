import {render} from '../utils/test-utils';
import TriggerButton from './TriggerButton';

const setup = (customProps = {}) => {
    const utils = render(
        <TriggerButton {...customProps} />
    );

    return {
        triggerFrame: utils.queryByTitle('portal-trigger'),
        rerender: utils.rerender,
        ...utils
    };
};

describe('Trigger Button', () => {
    let originalInnerWidth;

    beforeEach(() => {
        originalInnerWidth = window.innerWidth;
        window.resizeTo = function (width) {
            Object.defineProperty(window, 'innerWidth', {
                configurable: true,
                value: width
            });
            window.dispatchEvent(new Event('resize'));
        };
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: originalInnerWidth
        });
    });

    test('renders when viewport is desktop size', () => {
        window.resizeTo(1024);
        const {triggerFrame} = setup();
        expect(triggerFrame).toBeInTheDocument();
    });

    test('does not render when viewport is mobile size', () => {
        window.resizeTo(375);
        const {triggerFrame} = setup();
        expect(triggerFrame).not.toBeInTheDocument();
    });

    test('removes itself when window is resized to mobile', () => {
        window.resizeTo(1024);
        const {rerender, queryByTitle} = setup();
        expect(queryByTitle('portal-trigger')).toBeInTheDocument();

        window.resizeTo(375);
        rerender(<TriggerButton />);
        expect(queryByTitle('portal-trigger')).not.toBeInTheDocument();
    });

    test('shows itself when window is resized to desktop', () => {
        window.resizeTo(375);
        const {rerender, queryByTitle} = setup();
        expect(queryByTitle('portal-trigger')).not.toBeInTheDocument();

        window.resizeTo(1024);
        rerender(<TriggerButton />);
        expect(queryByTitle('portal-trigger')).toBeInTheDocument();
    });
});
