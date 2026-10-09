import { formatNumber } from '../../utils/helpers';
import { useAppContext } from '../../app-context';
import type { FunctionComponent } from 'preact';

type CountProps = {
  showCount: boolean;
  count: number;
};
const Count: FunctionComponent<CountProps> = ({ showCount, count }) => {
  const { t } = useAppContext();

  if (!showCount) {
    return null;
  }

  if (count === 1) {
    return (
      <div
        className="text-md text-neutral-900/50 dark:text-white/50 sm:text-lg"
        data-testid="count"
      >
        {t('1 comment')}
      </div>
    );
  }

  return (
    <div className="text-md text-neutral-900/50 dark:text-white/50 sm:text-lg" data-testid="count">
      {t('{amount} comments', { amount: formatNumber(count) })}
    </div>
  );
};

const Title: FunctionComponent<{ title: string | null }> = ({ title }) => {
  const { t } = useAppContext();

  if (title === null) {
    return (
      <>
        <span className="sm:hidden">{t('Discussion')}</span>
        <span className="hidden sm:inline">{t('Member discussion')}</span>
      </>
    );
  }

  return <>{title}</>;
};

type ContentTitleProps = {
  title: string | null;
  showCount: boolean;
  count: number;
};
const ContentTitle: FunctionComponent<ContentTitleProps> = ({ title, showCount, count }) => {
  // We have to check for null for title because null means default, wheras empty string means empty
  if (!title && !showCount && title !== null) {
    return null;
  }

  return (
    <div className="mb-7 flex w-full items-baseline justify-between font-sans">
      <h2
        className="text-[2.2rem] font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl"
        data-testid="title"
      >
        <Title title={title} />
      </h2>
      <Count count={count} showCount={showCount} />
    </div>
  );
};

export default ContentTitle;
