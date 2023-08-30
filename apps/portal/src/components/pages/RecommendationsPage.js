import AppContext from '../../AppContext';
import {useContext} from 'react';

// Dummy data for design purposes. To be deleted when wired up with real data.
const recommendations = [
    {
        title: 'Mountains by bike',
        url: 'https://unsplash.com/photos/1527pjeb6jg',
        reason: 'Incredible photography, captivating stories.',
        excerpt: 'Explore mountains with me and my bike!',
        featured_image: 'https://unsplash.com/photos/1527pjeb6jg',
        favicon: 'https://unsplash.com/photos/1527pjeb6jg'
    },
    {
        title: 'By the seaside',
        url: 'https://unsplash.com/photos/V3l7m298DLg',
        reason: 'Sea, sunsets, beers. What else do you need?',
        excerpt: 'Enjoy the sea!',
        featured_image: 'https://unsplash.com/photos/V3l7m298DLg',
        favicon: 'https://unsplash.com/photos/V3l7m298DLg'
    }
];

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
