import PropTypes from 'prop-types';

import UnsplashImage from './UnsplashImage';

function UnsplashZoomed({payload, insertImage, selectImg, zoomed}) {
    return (
        <div className="flex h-full grow basis-0 justify-center" data-kg-unsplash-zoomed onClick={() => selectImg(null)}>
            <UnsplashImage 
                alt={payload.alt_description}
                height={payload.height}
                insertImage={insertImage}
                likes={payload.likes}
                links={payload.links}
                payload={payload}
                selectImg={selectImg}
                srcUrl={payload.urls.regular}
                urls={payload.urls}
                user={payload.user}
                width={payload.width}
                zoomed={zoomed}

            />
        </div>
    );
}

export default UnsplashZoomed;

UnsplashZoomed.propTypes = {
    payload: PropTypes.object,
    insertImage: PropTypes.func,
    selectImg: PropTypes.func,
    zoomed: PropTypes.object || PropTypes.bool,
    srcUrl: PropTypes.string,
    alt: PropTypes.string,
    links: PropTypes.object,
    likes: PropTypes.number,
    user: PropTypes.object,
    urls: PropTypes.object,
    height: PropTypes.number,
    width: PropTypes.number
};
