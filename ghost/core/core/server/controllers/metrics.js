const axios = require('axios').default;
const logging = require('@tryghost/logging');
const config = require('../../shared/config');

const metricsController = {
    async proxy(req, res) {
        try {
            const tinybirdConfig = config.get('tinybird:tracker');
            const {endpoint, datasource, token} = tinybirdConfig;

            if (!endpoint || !datasource || !token) {
                return res.status(400).json({
                    error: 'Tinybird analytics is not configured'
                });
            }

            // eslint-disable-next-line camelcase -- Tinybird uses snake_case
            const {timestamp, action, version, session_id, payload} = req.body;

            // remove any undefined values
            const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
                if (value !== 'undefined' && value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {});

            const data = {
                timestamp,
                action,
                version,
                session_id, // eslint-disable-line camelcase
                payload: cleanPayload
            };

            const url = `${endpoint}/v0/events?name=${datasource}&token=${token}`;

            const response = await axios.post(
                url,
                JSON.stringify(data),
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            res.status(200).json(response.data);
        } catch (error) {
            logging.error('Error proxying metrics to Tinybird:', error);
            res.status(500).json({
                error: 'Failed to proxy metrics to Tinybird'
            });
        }
    }
};

module.exports = metricsController; 