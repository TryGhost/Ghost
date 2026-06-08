import {type ZapierTemplate} from '../components/settings/advanced/integrations/zapier-modal';

// Ghost logo images
import OrbBlack1 from '../assets/images/logos/orb-black-1.png';
import OrbBlack2 from '../assets/images/logos/orb-black-2.png';
import OrbBlack3 from '../assets/images/logos/orb-black-3.png';
import OrbBlack4 from '../assets/images/logos/orb-black-4.png';
import OrbBlack5 from '../assets/images/logos/orb-black-5.png';

// Integration app images
import GoogleDocsIcon from '../assets/images/integrations/google-docs.svg';
import MailchimpIcon from '../assets/images/integrations/mailchimp.svg';
import PatreonIcon from '../assets/images/integrations/patreon.svg';
import PaypalIcon from '../assets/images/integrations/paypal.svg';
import SlackIcon from '../assets/images/integrations/slackicon.png';
import TypeformIcon from '../assets/images/integrations/typeform.svg';
import ZeroBounceIcon from '../assets/images/integrations/zero-bounce.png';

export const zapierTemplates: ZapierTemplate[] = [{
    ghostImage: OrbBlack2,
    appImage: SlackIcon,
    title: 'Share scheduled posts with your team in Slack',
    url: 'https://zapier.com/webintent/create-zap?template=359499'
}, {
    ghostImage: OrbBlack3,
    appImage: PatreonIcon,
    title: 'Connect Patreon to your Ghost membership site',
    url: 'https://zapier.com/webintent/create-zap?template=75801'
}, {
    ghostImage: OrbBlack4,
    appImage: ZeroBounceIcon,
    title: 'Protect email delivery with email verification',
    url: 'https://zapier.com/webintent/create-zap?template=359415'
}, {
    ghostImage: OrbBlack5,
    appImage: PaypalIcon,
    title: 'Add members for successful sales in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=184423'
}, {
    ghostImage: OrbBlack3,
    appImage: PaypalIcon,
    title: 'Unsubscribe members who cancel a subscription in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=359348'
}, {
    ghostImage: OrbBlack1,
    appImage: GoogleDocsIcon,
    title: 'Send new post drafts from Google Docs to Ghost',
    url: 'https://zapier.com/webintent/create-zap?template=50924'
}, {
    ghostImage: OrbBlack4,
    appImage: TypeformIcon,
    title: 'Survey new members using Typeform',
    url: 'https://zapier.com/webintent/create-zap?template=359407'
}, {
    ghostImage: OrbBlack1,
    appImage: MailchimpIcon,
    title: 'Sync email subscribers in Ghost + Mailchimp',
    url: 'https://zapier.com/webintent/create-zap?template=359342'
}];
