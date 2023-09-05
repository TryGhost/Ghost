import AppContext from '../../AppContext';
import {useContext, useState, useEffect} from 'react';

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

const shuffleRecommendations = (array) => {
    let currentIndex = array.length;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex > 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
};

const RecommendationItem = ({title, url, reason, favicon}) => {
    const {t} = useContext(AppContext);

    return (
        <section className="gh-portal-recommendation-item">
            <div className="gh-portal-list-detail gh-portal-list-big">
                <div className="gh-portal-recommendation-item-header">
                    {favicon && <img className="gh-portal-recommendation-item-favicon" src={favicon} alt={title}/>}
                    <h3>{title}</h3>
                </div>
                {reason && <p>{reason}</p>}
            </div>
            <div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="gh-portal-btn gh-portal-btn-list">{t('Visit')}</a>
            </div>
        </section>
    );
};

const RecommendationsPage = () => {
    const {site, t} = useContext(AppContext);
    const {title, icon} = site;
    const {recommendations_enabled: recommendationsEnabled = false} = site;
    const {recommendations = []} = site;

    // Show 5 recommendations by default
    const [numToShow, setNumToShow] = useState(5);

    // Show recommendations in a random order
    const [shuffledRecommendations, setShuffledRecommendations] = useState([]);

    useEffect(() => {
        // Shuffle the array once when the component mounts
        setShuffledRecommendations(shuffleRecommendations([...recommendations]));
    }, [recommendations]);

    const showAllRecommendations = () => {
        setNumToShow(recommendations.length);
    };

    if (!recommendationsEnabled || recommendations.length < 1) {
        return null;
    }

    return (
        <div className='gh-portal-content with-footer'>
            <div className="gh-portal-recommendations-header">
                {icon && <img className="gh-portal-signup-logo" alt={title} src={icon} />}
                <h1 className="gh-portal-main-title">{t('Recommendations')}</h1>
            </div>
            <p className="gh-portal-recommendations-description">{t(`Here are a few other sites ${title} thinks you may enjoy.`)}</p>

            <div className="gh-portal-list">
                {shuffledRecommendations.slice(0, numToShow).map((recommendation, index) => (
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
