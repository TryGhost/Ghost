import { CloseIcon } from '../icons';
import type { FunctionComponent } from 'preact';

type Props = {
  close: () => void;
};
const CloseButton: FunctionComponent<Props> = ({ close }) => {
  return (
    <button
      className="absolute right-6 top-5 opacity-30 transition-opacity duration-100 ease-out hover:opacity-40 sm:right-8 sm:top-9"
      type="button"
      onClick={close}
    >
      <CloseIcon className="size-5 p-1 pr-0" />
    </button>
  );
};

export default CloseButton;
