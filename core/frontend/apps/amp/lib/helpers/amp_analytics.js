// # Amp Components Helper
// Usage: `{{amp_analytics}}`
//
// Outputs inline scripts used for analytics

const proxy = require('../../../../services/proxy');

const SafeString = proxy.SafeString;
const settingsCache = proxy.settingsCache;

function ampComponents() {
    let components = [];

    const ampGtagId = settingsCache.get('amp_gtag_id');
    if (ampGtagId) {
        components.push(`
            <amp-analytics type="gtag" data-credentials="include">
                <script type="application/json">
                    {
                        "vars" : {
                            "gtag_id": "${ampGtagId}",
                            "config" : {
                                "${ampGtagId}": { "groups": "default" }
                            }
                        }
                    }
                </script>
            </amp-analytics>
        `);
    }

    return new SafeString(components.join('\n'));
}

module.exports = ampComponents;
