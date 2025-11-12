const {escapeHtml} = require('../../../../koenig/render-utils/escape-html');

const SAFE_URL_PROTOCOLS = ['http:', 'https:'];

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    const trimmedUrl = url.trim();
    
    try {
        const parsedUrl = new URL(trimmedUrl);
        
        if (!SAFE_URL_PROTOCOLS.includes(parsedUrl.protocol)) {
            return '';
        }
        
        return escapeHtml(parsedUrl.href);
    } catch (e) {
        return '';
    }
}

module.exports = ({memberName, siteTitle, siteUrl, accentColor = '#15212A'}) => {
    const safeSiteTitle = escapeHtml(siteTitle || '');
    const safeMemberName = escapeHtml(memberName || 'there');
    const safeSiteUrl = sanitizeUrl(siteUrl);
    
    return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Welcome to ${safeSiteTitle}!</title>
    <style>
    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
      table[class=body] ul,
      table[class=body] ol,
      table[class=body] td,
      table[class=body] span,
      table[class=body] a {
        font-size: 16px !important;
      }
      table[class=body] .wrapper,
      table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
    }
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
    }
    a {
      color: ${accentColor};
    }
    </style>
  </head>
  <body style="background-color: #F5F8FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.5em; margin: 0; padding: 0;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; width: 100%; background-color: #F5F8FA;">
      <tr>
        <td style="vertical-align: top;">&nbsp;</td>
        <td class="container" style="vertical-align: top; display: block; margin: 0 auto; max-width: 540px; padding: 10px; width: 540px;">
          <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 600px; padding: 30px 20px;">
            <table class="main" style="border-collapse: separate; width: 100%; background: #ffffff; border-radius: 8px;">
              <tr>
                <td class="wrapper" style="box-sizing: border-box; padding: 40px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; width: 100%;">
                    <tr>
                      <td>
                        <p style="font-size: 20px; color: #15212A; font-weight: bold; line-height: 24px; margin: 0; margin-bottom: 15px;">Welcome to ${safeSiteTitle}!</p>
                        <p style="font-size: 16px; color: #3A464C; font-weight: normal; line-height: 24px; margin: 0; margin-bottom: 20px;">Hi ${safeMemberName},</p>
                        <p style="font-size: 16px; color: #3A464C; font-weight: normal; line-height: 24px; margin: 0; margin-bottom: 20px;">Thanks for joining! We're excited to have you as part of our community.</p>
                        <table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; width: 100%; box-sizing: border-box;">
                          <tbody>
                            <tr>
                              <td align="left" style="padding-bottom: 15px;">
                                <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; width: auto;">
                                  <tbody>
                                    <tr>
                                      <td style="background-color: ${accentColor}; border-radius: 5px; text-align: center;">
                                        <a href="${safeSiteUrl}" target="_blank" style="display: inline-block; color: #ffffff; background-color: ${accentColor}; border: solid 1px ${accentColor}; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 16px; font-weight: normal; margin: 0; padding: 12px 24px; border-color: ${accentColor};">Visit ${safeSiteTitle}</a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div class="footer" style="clear: both; margin-top: 20px; text-align: center; width: 100%;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; width: 100%;">
                <tr>
                  <td class="content-block" style="color: #738A94; font-size: 13px; line-height: 16px; padding-bottom: 10px; padding-top: 10px; text-align: center;">
                    <span class="recipient-link">${safeSiteTitle}</span>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
        <td style="vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`;
};

