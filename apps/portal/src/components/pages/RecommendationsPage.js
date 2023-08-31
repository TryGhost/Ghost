import AppContext from '../../AppContext';
import {useContext} from 'react';

export const RecommendationsPageStyles = `
  .gh-portal-recommendation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
  }
`;

const RecommendationItem = ({title, url, excerpt}) => {
    const {t} = useContext(AppContext);

    return (
        <section className="gh-portal-list-toggle-wrapper gh-portal-recommendation-item">
            <div className="gh-portal-list-detail gh-portal-list-big">
                <h3>{title}</h3>
                <p>{excerpt}</p>
            </div>
            <div className="gh-portal-lock-icon-container">
                <a href={url} target="_blank" rel="noopener noreferrer">{t('Visit')}</a>
            </div>
        </section>
    );
};

const RecommendationsPage = () => {
    const {site, t} = useContext(AppContext);
    const recommendations = site.recommendations || [];

    return (
        <div className='gh-portal-content with-footer'>
            <h1 className="gh-portal-text-center gh-portal-text-large pb6">{t('Recommendations')}</h1>
            <p className="gh-portal-text-center pb4">{t(`Here are a few other sites ${site.title} thinks you may enjoy.`)}</p>

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
