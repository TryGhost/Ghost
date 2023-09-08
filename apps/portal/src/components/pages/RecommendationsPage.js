import AppContext from '../../AppContext';
import {useContext, useState, useEffect} from 'react';
import CloseButton from '../common/CloseButton';
import {clearURLParams} from '../../utils/notifications';
import LoadingPage from './LoadingPage';

export const RecommendationsPageStyles = `
    .gh-portal-recommendation-item .gh-portal-list-detail {
        padding: 4px 24px 4px 0px;
    }

  .gh-portal-recommendation-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gh-portal-recommendation-item-favicon {
    width: 20px;
    height: 20px;
    border-radius: 3px;
  }

  .gh-portal-recommendations-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }

  .gh-portal-recommendations-description {
    text-align: center;
  }
`;

// Fisher-Yates shuffle
// @see https://stackoverflow.com/a/2450976/3015595
const shuffleRecommendations = (array) => {
    let currentIndex = array.length;
    let randomIndex;

    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
};

const RecommendationIcon = ({title, favicon, featuredImage}) => {
    const [icon, setIcon] = useState(favicon || featuredImage);

    const hideIcon = () => {
        setIcon(null);
    };

    if (!icon) {
        return null;
    }

    return (<img className="gh-portal-recommendation-item-favicon" src={icon} alt={title} onError={hideIcon} />);
};

const RecommendationItem = (recommendation) => {
    const {t} = useContext(AppContext);
    const {title, url, reason, favicon, one_click_subscribe: oneClickSubscribe, featured_image: featuredImage} = recommendation;

    return (
        <section className="gh-portal-recommendation-item">
            <div className="gh-portal-list-detail gh-portal-list-big">
                <div className="gh-portal-recommendation-item-header">
                    <RecommendationIcon title={title} favicon={favicon} featuredImage={featuredImage} />
                    <h3>{title}</h3>
                </div>
                {reason && <p>{reason}</p>}
            </div>
            <div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="gh-portal-btn gh-portal-btn-list">{oneClickSubscribe ? t('Subscribe') : t('Visit')}</a>
            </div>
        </section>
    );
};

const RecommendationsPage = () => {
    const {api, site, pageData, t} = useContext(AppContext);
    const {title, icon} = site;
    const {recommendations_enabled: recommendationsEnabled = false} = site;
    const [recommendations, setRecommendations] = useState(null);

    useEffect(() => {
        api.site.recommendations({limit: 100}).then((data) => {
            setRecommendations(
                shuffleRecommendations(data.recommendations
                ));
        }).catch((err) => {
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

    const heading = pageData && pageData.signup ? t('You\'re subscribed!') : t('Recommendations');
    const subheading = t(`Here are a few other sites {{siteTitle}} thinks you may enjoy.`, {siteTitle: title});

    if (!recommendationsEnabled) {
        return null;
    }

    if (recommendations === null) {
        return <LoadingPage/>;
    }

    return (
        <div className='gh-portal-content with-footer'>
            <CloseButton />
            <div className="gh-portal-recommendations-header">
                {icon && <img className="gh-portal-signup-logo" alt={title} src={icon} />}
                <h1 className="gh-portal-main-title">{heading}</h1>
            </div>
            <p className="gh-portal-recommendations-description">{subheading}</p>

            <div className="gh-portal-list">
                {recommendations.slice(0, numToShow).map((recommendation, index) => (
                    <RecommendationItem key={index} {...recommendation} />
                ))}
            </div>

            {numToShow < recommendations.length && (
                <footer className='gh-portal-action-footer'>
                    <button className='gh-portal-btn gh-portal-center' style={{width: '100%'}} onClick={showAllRecommendations}>
                        <span>{t('Show all')}</span>
                    </button>
                </footer>
            )}
        </div>
    );
};

export default RecommendationsPage;
