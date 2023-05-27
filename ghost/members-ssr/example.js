const jwt = require('jsonwebtoken');
const keypair = require('keypair');
const MembersSSR = require('./');
const keys = keypair();

const membersApiInstance = {
    /**
     * @param {string} token
     */
    async getMemberDataFromMagicLinkToken(token) {
        return jwt.decode(token);
    },
    async getMemberIdentityData() {
        return {name: 'egg'};
    }
};

const membersSSR = MembersSSR({
    cookieSecure: false, // Secure cookie (default)
    cookieKeys: ['some-coole-secret'], // Key to sign cookie with
    getMembersApi: () => membersApiInstance // Used to fetch data and verify tokens
});

const server = require('http').createServer(async (req, res) => {
    if (!req.method) {
        res.writeHead(405);
        return res.end('Method not allowed.');
    }
    if (req.method.toLowerCase() === 'post') {
        try {
            await membersSSR.exchangeTokenForSession(req, res);
            res.writeHead(200);
            res.end();
        } catch (err) {
            res.writeHead(err.statusCode, {
                'Content-Type': 'text/plain;charset=UTF-8'
            });
            res.end(err.message);
        }
    } else {
        try {
            const member = await membersSSR.getMemberDataFromSession(req, res);
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(member));
        } catch (err) {
            res.writeHead(err.statusCode, {
                'Content-Type': 'text/plain;charset=UTF-8'
            });
            res.end(err.message);
        }
    }
});

server.listen(0, '127.0.0.1', () => {
    const addressInfo = server.address();
    if (addressInfo === null || typeof addressInfo === 'string') {
        throw new TypeError({
            message: `Unexpected return value from server.address(): ${addressInfo}`
        });
    }
    const {address, port} = addressInfo;
    const url = `http://${address}:${port}`;

    const token = jwt.sign({
        name: 'egg',
        email: 'egg@mast.er'
    }, keys.private, {
        issuer: 'example.com',
        audience: 'example.com',
        algorithm: 'RS512'
    });

    require('http').request(`${url}?token=${token}`, {
        method: 'post'
    }, (loginResponse) => {
        const cookies = loginResponse.headers['set-cookie'] || [];
        require('http').request(url, {
            headers: {
                cookie: cookies.join('; ')
            }
        }, (authResponse) => {
            authResponse.pipe(process.stdout);
            authResponse.on('close', () => {
                server.close();
            });
        }).end();
    }).end();
});

server.on('close', () => {
    process.exit(1);
});
