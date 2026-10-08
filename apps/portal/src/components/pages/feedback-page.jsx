import { useContext, useEffect, useState } from 'react';
import AppContext from '../../app-context';
import ThumbDownIcon from '../../images/icons/thumbs-down.svg?react';
import ThumbUpIcon from '../../images/icons/thumbs-up.svg?react';
import ThumbErrorIcon from '../../images/icons/thumbs-error.svg?react';
import setupGhostApi from '../../utils/api';
import { chooseBestErrorMessage } from '../../utils/errors';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import LoadingPage from './loading-page';
import { t } from '../../utils/i18n';

function ErrorPage({ error }) {
  const { doAction } = useContext(AppContext);

  return (
    <div className="gh-portal-content gh-portal-feedback with-footer relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-sm:group-[.feedback]/wrapper:[&_.gh-portal-closeicon-container]:hidden">
      <CloseButton />
      <div className="gh-feedback-icon gh-feedback-icon-error mx-auto my-0 w-24 px-0 py-2.5 text-center text-[#f50b23]">
        <ThumbErrorIcon />
      </div>
      <h1 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-grey-0 max-sm:group-[.feedback]/wrapper:text-[2.5rem]">
        {t('Sorry, that didn’t work.')}
      </h1>
      <div>
        <p className="gh-portal-text-center text-pretty px-8 pb-3 pt-4 text-center max-sm:px-2 max-sm:group-[.feedback]/wrapper:mb-[1.2rem]">
          {error}
        </p>
      </div>
      <ActionButton
        style={{ width: '100%' }}
        retry={false}
        onClick={() => doAction('closePopup')}
        disabled={false}
        brandColor="#000000"
        label={t('Close')}
        isRunning={false}
        tabIndex={3}
        classes={'sticky bottom'}
      />
    </div>
  );
}

const ConfirmDialog = ({ onConfirm, loading, initialScore }) => {
  const { doAction, brandColor } = useContext(AppContext);
  const [score, setScore] = useState(initialScore);

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  const close = () => {
    doAction('closePopup');
  };

  const submit = async (event) => {
    event.stopPropagation();
    await onConfirm(score);
  };

  const getButtonClassNames = (value) => {
    const baseClassName =
      "gh-feedback-button relative flex cursor-pointer items-center justify-center gap-2 rounded-[22px] border-none bg-transparent px-2 py-3 text-md font-bold leading-[1.2] text-[#505050] before:absolute before:left-0 before:top-0 before:size-full before:rounded-[inherit] before:bg-current before:opacity-10 before:content-[''] rtl:before:left-auto rtl:before:right-0 [&_svg]:size-6 [&_svg]:[color:inherit] [&_svg_path]:stroke-[4px]";
    return value === score
      ? `${baseClassName} gh-feedback-button-selected [box-shadow:inset_0_0_0_2px_currentColor]`
      : baseClassName;
  };

  const getInlineStyles = (value) => {
    return value === score ? { color: brandColor } : {};
  };

  return (
    <div
      className="gh-portal-confirm-dialog max-sm:group-[.feedback]/wrapper:[&_.gh-portal-closeicon-container]:hidden"
      onMouseDown={stopPropagation}
    >
      <h1 className="gh-portal-confirm-title mx-0 mb-1 mt-0 box-border text-center text-[24px] font-bold leading-[inherit] tracking-[-.018em] max-sm:group-[.feedback]/wrapper:text-[2.5rem]">
        {t('Give feedback on this post')}
      </h1>

      <div className="gh-feedback-buttons-group mt-9 grid grid-cols-[1fr_1fr] gap-4 max-sm:mt-7">
        <button
          className={getButtonClassNames(1)}
          style={getInlineStyles(1)}
          onClick={() => setScore(1)}
        >
          <ThumbUpIcon />
          {t('More like this')}
        </button>

        <button
          className={getButtonClassNames(0)}
          style={getInlineStyles(0)}
          onClick={() => setScore(0)}
        >
          <ThumbDownIcon />
          {t('Less like this')}
        </button>
      </div>

      <ActionButton
        classes="gh-portal-confirm-button mt-9 w-full max-sm:mt-7"
        retry={false}
        onClick={submit}
        disabled={false}
        brandColor={brandColor}
        label={t('Submit feedback')}
        isRunning={loading}
        tabIndex={3}
      />
      <CloseButton close={() => close(false)} />
    </div>
  );
};

async function sendFeedback({ siteUrl, uuid, key, postId, score }, api) {
  const ghostApi = api || setupGhostApi({ siteUrl });
  await ghostApi.feedback.add({ uuid, postId, key, score });
}

const LoadingFeedbackView = ({ action, score }) => {
  useEffect(() => {
    action(score);
  });

  return <LoadingPage />;
};

const ConfirmFeedback = ({ positive }) => {
  const { doAction, brandColor } = useContext(AppContext);

  const icon = positive ? <ThumbUpIcon /> : <ThumbDownIcon />;

  return (
    <div className="gh-portal-content gh-portal-feedback relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-sm:group-[.feedback]/wrapper:[&_.gh-portal-closeicon-container]:hidden">
      <CloseButton />

      <div className="gh-feedback-icon mx-auto my-0 w-12 px-0 py-2.5 text-center text-brand">
        {icon}
      </div>
      <h1 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-grey-0 max-sm:group-[.feedback]/wrapper:text-[2.5rem]">
        {t('Thanks for the feedback!')}
      </h1>
      <p className="gh-portal-text-center text-pretty px-8 pb-3 pt-4 text-center max-sm:px-2 max-sm:group-[.feedback]/wrapper:mb-[1.2rem]">
        {t('Your input helps shape what gets published.')}
      </p>
      <ActionButton
        style={{ width: '100%' }}
        retry={false}
        onClick={() => doAction('closePopup')}
        disabled={false}
        brandColor={brandColor}
        label={t('Close')}
        isRunning={false}
        tabIndex={3}
        classes={'sticky bottom'}
      />
    </div>
  );
};

export default function FeedbackPage() {
  const { site, pageData, member, api } = useContext(AppContext);
  const { uuid, key, postId, score: initialScore } = pageData;
  const [score, setScore] = useState(initialScore);
  const positive = score === 1;
  const isLoggedIn = !!member;
  const fromEmailLink = !!(uuid && key);

  const [confirmed, setConfirmed] = useState(fromEmailLink && isLoggedIn);
  const [loading, setLoading] = useState(fromEmailLink && isLoggedIn);
  const [error, setError] = useState(null);

  const doSendFeedback = async (selectedScore) => {
    setLoading(true);
    try {
      await sendFeedback({ siteUrl: site.url, uuid, key, postId, score: selectedScore }, api);
      setScore(selectedScore);
    } catch (e) {
      const text = chooseBestErrorMessage(
        e,
        t('There was a problem submitting your feedback. Please try again a little later.'),
      );
      setError(text);
    }
    setLoading(false);
  };

  const onConfirm = async (selectedScore) => {
    await doSendFeedback(selectedScore);
    setConfirmed(true);
  };

  // Case: failed
  if (error) {
    return <ErrorPage error={error} />;
  }

  if (!confirmed) {
    return <ConfirmDialog onConfirm={onConfirm} loading={loading} initialScore={score} />;
  } else {
    if (loading) {
      return <LoadingFeedbackView action={doSendFeedback} score={score} />;
    }
  }
  return <ConfirmFeedback positive={positive} />;
}
