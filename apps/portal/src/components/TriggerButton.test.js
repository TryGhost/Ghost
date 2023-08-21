import {render} from '../utils/test-utils';
import TriggerButton from './TriggerButton';

const setup = () => {
    const {mockOnActionFn, ...utils} = render(
        <TriggerButton />
    );

    const triggerFrame = utils.getByTitle('portal-trigger');
    return {
        mockOnActionFn,
        triggerFrame,
        ...utils
    };
};

describe('Trigger Button', () => {
    test('renders', () => {
        const {triggerFrame} = setup();

        expect(triggerFrame).toBeInTheDocument();
    });
});
