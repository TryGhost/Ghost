import { SuccessView } from './success-view';
import { useAppContext } from '../../app-context';

type SuccessPageProps = {
  email: string;
};

export const SuccessPage = ({ email }: SuccessPageProps) => {
  const { options } = useAppContext();

  return (
    <SuccessView
      backgroundColor={options.backgroundColor}
      email={email}
      textColor={options.textColor}
    />
  );
};
