function setupGhostApi({apiUrl}) {
    function makeRequest({url, method = 'GET', headers = {}, credentials = undefined, body = undefined}) {
        const options = {
            method,
            headers,
            credentials,
            body
        };
        return fetch(url, options);
    }
    const api = {};

    api.announcementSettings = {
        browse() {
            const url = apiUrl;
            return makeRequest({
                url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to fetch site data');
                }
            });
        }
    };

    api.init = async () => {
        let {announcement} = await api.announcementSettings.browse();
        return announcement[0];
    };

    return api;
}

export default setupGhostApi;
