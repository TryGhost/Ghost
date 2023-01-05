import PropTypes from 'prop-types';

import UnsplashImage from './UnsplashImage';

function UnsplashZoomed({payload, insertImage, selectImg, zoomed}) {
    return (
        <div data-kg-unsplash-zoomed onClick={() => selectImg(null)} className="flex h-full grow basis-0 justify-center">
            <UnsplashImage 
                payload={payload}
                srcUrl={payload.urls.regular}
                alt={payload.alt_description}
                links={payload.links}
                likes={payload.likes}
                user={payload.user}
                urls={payload.urls}
                height={payload.height}
                width={payload.width}
                selectImg={selectImg}
                insertImage={insertImage}
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
