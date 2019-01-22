function getData(...props) {
    return function (req, res, next) {
        if (!req.body) {
            res.writeHead(400);
            return res.end();
        }

        const data = props.concat('origin').reduce((data, prop) => {
            if (!data || !req.body[prop]) {
                return null;
            }
            return Object.assign(data, {
                [prop]: req.body[prop]
            });
        }, {});

        if (!data) {
            res.writeHead(400);
            return res.end(`Expected {${props.join(', ')}}`);
        }
        req.data = data || {};
        next();
    };
}

function handleError(status, res) {
    return function () {
        res.writeHead(status);
        res.end();
    };
}

module.exports = {
    getData,
    handleError
};
