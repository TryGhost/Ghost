import AppContext from '../../AppContext';
import {useContext} from 'react';

export const RecommendationsPageStyles = `
  .gh-portal-recommendation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
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

const RecommendationItem = ({title, url, reason, favicon}) => {
    const {t} = useContext(AppContext);

    return (
        <section className="gh-portal-recommendation-item">
            <div className="gh-portal-list-detail gh-portal-list-big">
                <div className="gh-portal-recommendation-item-header">
                    {favicon && <img className="gh-portal-recommendation-item-favicon" src={favicon} alt={title}/>}
                    <h3>{title}</h3>
                </div>
                <p>{reason}</p>
            </div>
            <div className="gh-portal-lock-icon-container">
                <a href={url} target="_blank" rel="noopener noreferrer" className="gh-portal-btn gh-portal-btn-list">{t('Visit')}</a>
            </div>
        </section>
    );
};

const RecommendationsPage = () => {
    const {site, t} = useContext(AppContext);
    const {title, icon} = site;
    const recommendations = site.recommendations || [];

    return (
        <div className='gh-portal-content with-footer'>
            <div className="gh-portal-recommendations-header">
                {icon && <img className="gh-portal-signup-logo" alt={title} src={icon} />}
                <h1 className="gh-portal-main-title">{t('Recommendations')}</h1>
            </div>
            <p className="gh-portal-recommendations-description">{t(`Here are a few other sites ${title} thinks you may enjoy.`)}</p>

            <div className="gh-portal-list">
                {recommendations.map((recommendation, index) => (
                    <RecommendationItem key={index} {...recommendation} />
                ))}
            </div>

            <footer className='gh-portal-action-footer'>
                <button className='gh-portal-btn gh-portal-center' style={{width: '100%'}}>
                    <span>{t('Show all')}</span>
                </button>
            </footer>
        </div>
    );
};

export default RecommendationsPage;
