import MainHeader from '../navigation/MainHeader';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import articleBodyStyles from '../articleBodyStyles';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {renderAttachment} from './FeedItem';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

interface ArticleModalProps {
    object: ObjectProperties;
}

const ArticleBody: React.FC<{heading: string, image: string|undefined, html: string}> = ({heading, image, html}) => {
    const site = useBrowseSite();
    const siteData = site.data?.site;

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
    ${cssContent}
  </head>
  <body>
    <header class='gh-article-header gh-canvas'>
        <h1 class='gh-article-title is-title' data-test-article-heading>${heading}</h1>
${image &&
        `<figure class='gh-article-image'>
            <img src='${image}' alt='${heading}' />
        </figure>`
}
    </header>
    <div class='gh-content gh-canvas is-body'>
      ${html}
    </div>
  </body>
  </html>
`;

    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            iframe.srcdoc = htmlContent;
        }
    }, [htmlContent]);

    return (
        <div>
            <iframe
                ref={iframeRef}
                className={`h-[calc(100vh_-_3vmin_-_4.8rem_-_2px)]`}
                height='100%'
                id='gh-ap-article-iframe'
                title='Embedded Content'
                width='100%'
            >
            </iframe>
        </div>
    );
};

const ArticleModal: React.FC<ArticleModalProps> = ({object}) => {
    const modal = useModal();
    return (
        <Modal
            align='right'
            animate={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={640}
        >
            <MainHeader>
                <div className='col-[3/4] flex items-center justify-end px-8'>
                    <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                </div>
            </MainHeader>
            <div className='mt-10 w-auto'>
                {object.type === 'Note' && (
                    <div className='mx-auto max-w-[580px]'>
                        {object.content && <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>}
                        {renderAttachment(object)}
                    </div>)}
                {object.type === 'Article' && <ArticleBody heading={object.name} html={object.content} image={object?.image}/>}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);