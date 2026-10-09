import AppContext from '../../app-context';
import { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import CloseButton from '../common/close-button';
import { clearURLParams } from '../../utils/notifications';
import LoadingPage from './loading-page';
import ArrowIcon from '../../images/icons/arrow-top-right.svg?react';
import LoaderIcon from '../../images/icons/loader.svg?react';
import CheckmarkIcon from '../../images/icons/check-circle.svg?react';

import { getRefDomain } from '../../utils/helpers';
import { t } from '../../utils/i18n';

// Fisher-Yates shuffle
// @see https://stackoverflow.com/a/2450976/3015595
const shuffleRecommendations = (array) => {
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

const RecommendationIcon = ({ title, favicon, featuredImage }) => {
  const [icon, setIcon] = useState(favicon || featuredImage);

  const hideIcon = () => {
    setIcon(null);
  };

  if (!icon) {
    return <div className="size-5 rounded-[3px]"></div>;
  }

  return <img className="size-5 rounded-[3px]" src={icon} alt={title} onError={hideIcon} />;
};

const openTab = (url) => {
  const tab = window.open(url, '_blank');
  if (tab) {
    tab.focus();
  } else {
    // Safari fix after async operation / failed to create a new tab
    window.location.href = url;
  }
};

const RecommendationItem = (recommendation) => {
  const { doAction, member, site } = useContext(AppContext);
  const {
    title,
    url,
    description,
    favicon,
    one_click_subscribe: oneClickSubscribe,
    featured_image: featuredImage,
  } = recommendation;
  const allowOneClickSubscribe = member && oneClickSubscribe;
  const [subscribed, setSubscribed] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const outboundLinkTagging = site.outbound_link_tagging ?? false;

  const refUrl = useMemo(() => {
    if (!outboundLinkTagging) {
      return url;
    }
    try {
      const ref = new URL(url);

      if (
        ref.searchParams.has('ref') ||
        ref.searchParams.has('utm_source') ||
        ref.searchParams.has('source')
      ) {
        // Don't overwrite + keep existing source attribution
        return url;
      }
      ref.searchParams.set('ref', getRefDomain());
      return ref.toString();
    } catch (_) {
      return url;
    }
  }, [url, outboundLinkTagging]);

  const visitHandler = useCallback(() => {
    // Open url in a new tab
    openTab(refUrl);

    if (!clicked) {
      doAction('trackRecommendationClicked', { recommendationId: recommendation.id });
      setClicked(true);
    }
  }, [refUrl, recommendation.id, clicked]);

  const oneClickSubscribeHandler = useCallback(async () => {
    try {
      setLoading(true);
      await doAction('oneClickSubscribe', {
        siteUrl: url,
        throwErrors: true,
      });
      doAction('trackRecommendationSubscribed', { recommendationId: recommendation.id });
      setSubscribed(true);
    } catch (_) {
      // Open portal signup page
      const signupUrl = new URL('#/portal/signup', refUrl);

      // Trigger a visit
      openTab(signupUrl);

      if (!clicked) {
        doAction('trackRecommendationClicked', { recommendationId: recommendation.id });
        setClicked(true);
      }
    }
    setLoading(false);
  }, [setSubscribed, url, refUrl, recommendation.id, clicked]);

  const clickHandler = useCallback(
    (e) => {
      if (loading) {
        return;
      }
      if (allowOneClickSubscribe) {
        oneClickSubscribeHandler(e);
      } else {
        visitHandler(e);
      }
    },
    [loading, allowOneClickSubscribe, oneClickSubscribeHandler, visitHandler],
  );

  return (
    <section className="gh-portal-recommendation-item min-h-[38px]">
      <div
        className="grow py-1 ps-0 pe-6 [transition:opacity_0.2s_ease-in-out] hover:cursor-pointer hover:opacity-80 [&:hover_.gh-portal-recommendation-arrow-icon]:opacity-80"
        onClick={visitHandler}
      >
        <div className="gh-portal-recommendation-item-header flex cursor-pointer items-center gap-2.5">
          <RecommendationIcon title={title} favicon={favicon} featuredImage={featuredImage} />
          <h3 className="text-16 font-semibold">{title}</h3>
          <ArrowIcon className="gh-portal-recommendation-arrow-icon -ms-1.5 h-3 opacity-0 [transition:opacity_0.2s_ease-in] [&_path]:[stroke:#555] [&_path]:[stroke-width:3px]" />
        </div>
        <div className="gh-portal-recommendation-description-container relative">
          {subscribed && (
            <div
              className={
                'gh-portal-recommendation-subscribed flex animate-fade-in items-center gap-1 ps-[30px] text-13.5 font-normal leading-[1.3em] tracking-[0.1px] ' +
                (description ? 'with-description absolute' : 'without-description mt-[5px]')
              }
            >
              <span className="text-gray-700">{t('Verification link sent, check your inbox')}</span>
              <CheckmarkIcon
                className="gh-portal-recommendation-checkmark-icon size-4 px-0.5 py-0 text-green"
                alt=""
              />
            </div>
          )}
          {description && (
            <p
              className={`${subscribed ? 'gh-portal-recommendation-description-hidden invisible ' : ''}mb-0 ms-0 me-2 mt-1 ps-[30px] text-13.5 leading-[1.3em] font-normal tracking-[0.1px] [word-break:break-word] text-gray-700 rtl:mt-[5px]`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="gh-portal-recommendation-item-action min-h-[28px]">
        {!subscribed && loading && (
          <span className="gh-portal-recommendations-loading-container">
            <LoaderIcon className="gh-portal-loadingicon dark relative! left-1/2 -ms-[19px] inline-block h-6 [&_path]:fill-black [&_rect]:fill-black" />
          </span>
        )}
        {!subscribed && !loading && allowOneClickSubscribe && (
          <button
            type="button"
            className="gh-portal-btn relative -mx-1 my-0 flex h-7 cursor-pointer items-center justify-center rounded-md border-none bg-white px-1 py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-brand no-underline outline-none select-none transition-control hover:border-gray-300 hover:opacity-75 disabled:cursor-auto disabled:opacity-50!"
            onClick={clickHandler}
          >
            {t('Subscribe')}
          </button>
        )}
      </div>
    </section>
  );
};

const RecommendationsPage = () => {
  const { api, site, pageData, doAction } = useContext(AppContext);
  const { title, icon } = site;
  const { recommendations_enabled: recommendationsEnabled = false } = site;
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    api.site
      .recommendations({ limit: 100 })
      .then((data) => {
        const withOneClickSubscribe = data.recommendations.filter(
          (recommendation) => recommendation.one_click_subscribe,
        );
        const withoutOneClickSubscribe = data.recommendations.filter(
          (recommendation) => !recommendation.one_click_subscribe,
        );

        setRecommendations([
          ...shuffleRecommendations(withOneClickSubscribe),
          ...shuffleRecommendations(withoutOneClickSubscribe),
        ]);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
  }, []);

  // Show 5 recommendations by default
  const [numToShow, setNumToShow] = useState(5);

  const showAllRecommendations = () => {
    setNumToShow(recommendations.length);
  };

  useEffect(() => {
    return () => {
      if (pageData.signup) {
        const deleteParams = [];
        deleteParams.push('action', 'success');
        clearURLParams(deleteParams);
      }
    };
  }, []);

  if (recommendations === null) {
    return <LoadingPage />;
  }

  const heading =
    pageData && pageData.signup
      ? t('Welcome to {siteTitle}', { siteTitle: title })
      : t('Recommendations');

  /* Possible cases:
    - no recommendations found - subhead says no recommendations are available.
    - recommendations found - show generic message
    - recommendations found and user just signed up - show specific message
    */

  let subheading;
  if (recommendationsEnabled && recommendations && recommendations.length > 0) {
    if (pageData && pageData.signup) {
      subheading = t(
        'Thank you for subscribing. Before you start reading, below are a few other sites you may enjoy.',
      );
    } else {
      subheading = t('Here are a few other sites you may enjoy.');
    }
  } else {
    subheading = t('Sorry, no recommendations are available right now.');
  }

  return (
    <div className="with-footer relative scrollbar-none ">
      <CloseButton />
      <div className="gh-portal-recommendations-header mb-5 flex flex-col items-center">
        {icon && (
          <img
            className="gh-portal-signup-logo relative mx-0 mt-3 mb-2.5 block size-[60px] rounded-sm bg-cover bg-center max-sm:size-12"
            alt={title}
            src={icon}
          />
        )}
        <h1 className="px-8 py-0 text-center leading-[1.1em] text-balance text-black [.gh-portal-signup-logo+&]:mt-1">
          {heading}
        </h1>
      </div>
      <p className="gh-portal-recommendations-description text-center">{subheading}</p>
      {recommendationsEnabled ? (
        <div className="gh-portal-list overflow-hidden rounded-lg border border-solid border-gray-200 bg-white p-0 [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--color-gray-200)] [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none">
          {recommendations.slice(0, numToShow).map((recommendation, index) => (
            <RecommendationItem key={index} {...recommendation} />
          ))}
        </div>
      ) : null}

      {(numToShow < recommendations.length || (pageData && pageData.signup)) && (
        <footer className="flex flex-col items-center justify-between gap-3 [.gh-portal-list+&]:mt-10">
          {numToShow < recommendations.length && (
            <button
              className="gh-portal-btn relative flex h-11 min-w-[80px] cursor-pointer items-center justify-center rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none transition-control hover:border-gray-300 disabled:cursor-auto disabled:opacity-50!"
              style={{ width: '100%' }}
              onClick={showAllRecommendations}
            >
              <span>{t('Show all')}</span>
            </button>
          )}
          {pageData && pageData.signup && (
            <button
              className="gh-portal-btn relative mx-auto mt-2 mb-6 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 text-center text-15 leading-none font-normal tracking-[0.2px] whitespace-nowrap text-gray-700 no-underline outline-none select-none transition-control hover:border-gray-300 hover:opacity-85 disabled:cursor-auto disabled:opacity-50!"
              style={{ width: '100%' }}
              onClick={showAllRecommendations}
            >
              <span onClick={() => doAction('closePopup')}>{t('Maybe later')}</span>
            </button>
          )}
        </footer>
      )}
    </div>
  );
};

export default RecommendationsPage;
