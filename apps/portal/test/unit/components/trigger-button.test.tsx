import { render } from '../../utils/test-utils';
import TriggerButton from '../../../src/components/trigger-button';

const setup = (customProps = {}) => {
  const utils = render(<TriggerButton {...customProps} />);

  return {
    triggerFrame: utils.queryByTitle('portal-trigger'),
    ...utils,
  };
};

function resizeTo(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

describe('Trigger Button', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  test('renders when viewport is desktop size', () => {
    resizeTo(1024);
    const { triggerFrame } = setup();
    expect(triggerFrame).toBeInTheDocument();
  });

  test('does not render when viewport is mobile size', () => {
    resizeTo(375);
    const { triggerFrame } = setup();
    expect(triggerFrame).not.toBeInTheDocument();
  });

  test('removes itself when window is resized to mobile', () => {
    resizeTo(1024);
    const { rerender, queryByTitle } = setup();
    expect(queryByTitle('portal-trigger')).toBeInTheDocument();

    resizeTo(375);
    rerender(<TriggerButton />);
    expect(queryByTitle('portal-trigger')).not.toBeInTheDocument();
  });

  test('shows itself when window is resized to desktop', () => {
    resizeTo(375);
    const { rerender, queryByTitle } = setup();
    expect(queryByTitle('portal-trigger')).not.toBeInTheDocument();

    resizeTo(1024);
    rerender(<TriggerButton />);
    expect(queryByTitle('portal-trigger')).toBeInTheDocument();
  });
});
