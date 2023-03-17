import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderVideoNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getSrc() || node.getSrc().trim() === '') {
        return document.createTextNode('');
    }

    const cardClasses = getCardClasses(node).join(' ');

    const htmlString = options.target === 'email'
        ? emailCardTemplate({node, options, cardClasses})
        : cardTemplate({node, cardClasses});

    const element = document.createElement('div');
    element.innerHTML = htmlString.trim();

    return element.firstElementChild;
}

export function cardTemplate({node, cardClasses}) {
    const width = node.getVideoWidth();
    const height = node.getVideoHeight();
    const posterSpacerSrc = `https://img.spacergif.org/v1/${width}x${height}/0a/spacer.png`;
    const autoplayAttr = node.getLoop() ? 'loop autoplay muted' : '';
    const thumbnailSrc = node.getCustomThumbnailSrc() || node.getThumbnailSrc();
    const hideControlsClass = node.getLoop() ? ' kg-video-hide' : '';

    return (
        `
        <figure class="${cardClasses}" data-kg-thumbnail=${node.getThumbnailSrc()} data-kg-custom-thumbnail=${node.getCustomThumbnailSrc()}>
            <div class="kg-video-container">
                <video
                    src="${node.getSrc()}"
                    poster="${posterSpacerSrc}"
                    width="${width}"
                    height="${height}"
                    ${autoplayAttr}
                    playsinline
                    preload="metadata"
                    style="background: transparent url('${thumbnailSrc}') 50% 50% / cover no-repeat;"
                ></video>
                <div class="kg-video-overlay">
                    <button class="kg-video-large-play-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"/>
                        </svg>
                    </button>
                </div>
                <div class="kg-video-player-container${hideControlsClass}">
                    <div class="kg-video-player">
                        <button class="kg-video-play-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                            </svg>
                        </button>
                        <button class="kg-video-pause-icon kg-video-hide">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                            </svg>
                        </button>
                        <span class="kg-video-current-time">0:00</span>
                        <div class="kg-video-time">
                            /<span class="kg-video-duration">${node.getFormattedDuration()}</span>
                        </div>
                        <input type="range" class="kg-video-seek-slider" max="100" value="0">
                        <button class="kg-video-playback-rate">1&#215;</button>
                        <button class="kg-video-unmute-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path>
                            </svg>
                        </button>
                        <button class="kg-video-mute-icon kg-video-hide">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path>
                            </svg>
                        </button>
                        <input type="range" class="kg-video-volume-slider" max="100" value="100"/>
                    </div>
                </div>
            </div>
            ${node.getCaption() ? `<figcaption>${node.getCaption()}</figcaption>` : ''}
        </figure>
    `
    );
}

export function emailCardTemplate({node, options, cardClasses}) {
    const thumbnailSrc = node.getCustomThumbnailSrc() || node.getThumbnailSrc();
    const emailTemplateMaxWidth = 600;
    const aspectRatio = node.getVideoWidth() / node.getVideoHeight();
    const emailSpacerWidth = Math.round(emailTemplateMaxWidth / 4);
    const emailSpacerHeight = Math.round(emailTemplateMaxWidth / aspectRatio);
    const posterSpacerSrc = `https://img.spacergif.org/v1/${emailSpacerWidth}x${emailSpacerHeight}/0a/spacer.png`;
    const outlookCircleLeft = Math.round((emailTemplateMaxWidth / 2) - 39);
    const outlookCircleTop = Math.round((emailSpacerHeight / 2) - 39);
    const outlookPlayLeft = Math.round((emailTemplateMaxWidth / 2) - 11);
    const outlookPlayTop = Math.round((emailSpacerHeight / 2) - 17);

    return (
        `
         <figure class="${cardClasses}">
            <!--[if !mso !vml]-->
            <a class="kg-video-preview" href="${options.postUrl}" aria-label="Play video" style="mso-hide: all">
                <table
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    width="100%"
                    background="${thumbnailSrc}"
                    role="presentation"
                    style="background: url('${thumbnailSrc}') left top / cover; mso-hide: all"
                >
                    <tr style="mso-hide: all">
                        <td width="25%" style="visibility: hidden; mso-hide: all">
                            <img src="${posterSpacerSrc}" alt="" width="100%" border="0" style="height: auto; opacity: 0; visibility: hidden; mso-hide: all;">
                        </td>
                        <td width="50%" align="center" valign="middle" style="vertical-align: middle; mso-hide: all;">
                            <div class="kg-video-play-button" style="mso-hide: all"><div style="mso-hide: all"></div></div>
                        </td>
                        <td width="25%" style="mso-hide: all">&nbsp;</td>
                    </tr>
                </table>
            </a>
            <!--[endif]-->

            <!--[if vml]>
            <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="${emailTemplateMaxWidth},${emailSpacerHeight}" coordorigin="0,0" href="${options.postUrl}" style="width:${emailTemplateMaxWidth}px;height:${emailSpacerHeight}px;">
                <v:rect fill="t" stroked="f" style="position:absolute;width:${emailTemplateMaxWidth};height:${emailSpacerHeight};"><v:fill src="${thumbnailSrc}" type="frame"/></v:rect>
                <v:oval fill="t" strokecolor="white" strokeweight="4px" style="position:absolute;left:${outlookCircleLeft};top:${outlookCircleTop};width:78;height:78"><v:fill color="black" opacity="30%" /></v:oval>
                <v:shape coordsize="24,32" path="m,l,32,24,16,xe" fillcolor="white" stroked="f" style="position:absolute;left:${outlookPlayLeft};top:${outlookPlayTop};width:30;height:34;" />
            </v:group>
            <![endif]-->

            ${node.getCaption() ? `<figcaption>${node.getCaption()}</figcaption>` : ''}
        </figure>
        `
    );
}

export function getCardClasses(node) {
    let cardClasses = ['kg-card kg-video-card'];

    if (node.getCardWidth()) {
        cardClasses.push(`kg-width-${node.getCardWidth()}`);
    }
    if (node.getCaption()) {
        cardClasses.push(`kg-card-hascaption`);
    }

    return cardClasses;
}
