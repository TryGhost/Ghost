const jwt = require('jsonwebtoken');
const keypair = require('keypair');
const MembersSSR = require('./');
const keys = keypair();

const membersApiInstance = {
    getMember() {
        return Promise.resolve({name: 'egg'});
    },
    getPublicConfig() {
        return Promise.resolve({
            issuer: 'example.com',
            publicKey: keys.public
        });
    }
};

const {
    exchangeTokenForSession,
    getMemberDataFromSession
} = MembersSSR({
    cookieSecure: false, // Secure cookie (default)
    cookieKeys: ['some-coole-secret'], // Key to sign cookie with
    membersApi: membersApiInstance // Used to fetch data and verify tokens
});

const server = require('http').createServer((req, res) => {
    if (req.method.toLowerCase() === 'post') {
        exchangeTokenForSession(req, res).then(() => {
            res.writeHead(200);
            res.end();
        }).catch((err) => {
            res.writeHead(err.statusCode);
            res.end(err.message);
        });
    } else {
        getMemberDataFromSession(req, res).then((member) => {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(member));
        }).catch((err) => {
            res.writeHead(err.statusCode);
            res.end(err.message);
        });
    }
});

server.listen(0, '127.0.0.1', () => {
    const {address, port} = server.address();
    const url = `http://${address}:${port}`;
    const token = jwt.sign({}, keys.private, {
        issuer: 'example.com',
        audience: 'example.com',
        algorithm: 'RS512'
    });

    require('http').request(url, {
        method: 'post',
        headers: {
            'content-type': 'text'
        }
    }, (res) => {
        require('http').request(url, {
            headers: {
                cookie: res.headers['set-cookie'].join('; ')
            }
        }, (res) => {
            res.pipe(process.stdout);
            res.on('close', () => {
                server.close();
            });
        }).end();
    }).end(token);
});

server.on('close', () => {
    process.exit(1);
});
