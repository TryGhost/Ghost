import AppContext from '../../AppContext';
import {useContext} from 'react';

// Dummy data for design purposes. To be deleted when wired up with real data.
const recommendations = [
    {
        title: 'She‘s A Beast',
        url: 'https://shesabeast.co',
        reason: 'She helped me get back into the gym after 8 years.',
        excerpt: 'Explore mountains with me and my bike!',
        featured_image: 'https://unsplash.com/photos/1527pjeb6jg',
        favicon: 'https://www.shesabeast.co/content/images/size/w256h256/2022/08/transparent-icon-black-copy-gray-bar.png'
    },
    {
        title: 'Lenny‘s Newsletter',
        url: 'https://www.lennysnewsletter.com/',
        reason: 'He knows his stuff about product management and gives away lots of content for free. Highly recommended!',
        excerpt: 'Enjoy the sea!',
        featured_image: 'https://unsplash.com/photos/V3l7m298DLg',
        favicon: 'https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc7cde267-8f9e-47fa-9aef-5be03bad95ed%2Fapple-touch-icon-1024x1024.png'
    }
];

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

    return (
        <div className='gh-portal-content with-footer'>
            <div className="gh-portal-recommendations-header">
                <img className="gh-portal-signup-logo" alt={site.title} src={site.icon} />
                <h1 className="gh-portal-main-title">{t('Recommendations')}</h1>
            </div>
            <p className="gh-portal-recommendations-description">{t(`Here are a few other sites ${site.title} thinks you may enjoy.`)}</p>

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
