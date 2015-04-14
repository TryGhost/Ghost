// # Ghost Configuration
// Setup your Ghost install for various environments
// Documentation can be found at http://support.ghost.org/config/

var path = require('path'),
    config;

config = {
    // ### Production
    // When running Ghost in the wild, use the production environment
    // Configure your URL and mail settings here
    production: {
        url: 'http://my-ghost-blog.com',
        mail: {},
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost.db')
            },
            debug: false
        },

        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: '2368'
        },

        // 图片存储引擎配置
        storage: {
            
            active: 'local-file-store', // 选择存储引擎 本地存储 : local-file-store / 七牛云存储: qiniu-store

            // 本地存储 ( 默认选项 )
            'local-file-store': {},  

            // 七牛云存储
            // AK, SK 获取地址  https://portal.qiniu.com/setting/key  
            // domain 获取地址 https://portal.qiniu.com/bucket/setting/domain?bucket=<空间名称>
            // 启用前请先将 content/images 目录上传至七牛空间
            // 
            'qiniu-store': {
                AK: '填写七牛云存储 AccessKey ',  // AccessKey
                SK: '填写七牛云存储 SecretKey',   // SecretKey
                bucket: '填写七牛云存储空间名称',              // 七牛云存储的空间名称
                prefix: 'ghost',             // 文件前缀 ( 目录 )
                domain: '填写空间域名',   // 访问域名
                protocol: 'http'   // 协议 http 或 https
            },
        }, 

        codeInjectionUI: true,
    },

    // ### Development **(default)**
    development: {
        // The url to use when providing links to the site, E.g. in RSS and email.
        // Change this to your Ghost blogs published URL.
        url: 'http://localhost:2368',

        // Example mail config
        // Visit http://support.ghost.org/mail for instructions
        // ```
        //  mail: {
        //      transport: 'SMTP',
        //      options: {
        //          service: 'Mailgun',
        //          auth: {
        //              user: '', // mailgun username
        //              pass: ''  // mailgun password
        //          }
        //      }
        //  },
        // ```


        // 图片存储引擎配置
        storage: {
            
            active: 'local-file-store', // 选择存储引擎 本地存储 : local-file-store / 七牛云存储: qiniu-store

            // 本地存储 ( 默认选项 )
            'local-file-store': {},  

            // 七牛云存储
            // AK, SK 获取地址  https://portal.qiniu.com/setting/key  
            // domain 获取地址 https://portal.qiniu.com/bucket/setting/domain?bucket=<空间名称>
            // 启用前请先将 content/images 目录上传至七牛空间
            // 
            'qiniu-store': {
                AK: '填写七牛云存储 AccessKey ',  // AccessKey
                SK: '填写七牛云存储 SecretKey',   // SecretKey
                bucket: '填写七牛云存储空间名称',              // 七牛云存储的空间名称
                prefix: 'ghost',             // 文件前缀 ( 目录 )
                domain: '填写空间域名',   // 访问域名
                protocol: 'http'   // 协议 http 或 https
            },
        }, 


        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-dev.db')
            },
            debug: false
        },
        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: '2368'
        },
        paths: {
            contentPath: path.join(__dirname, '/content/')
        },

        codeInjectionUI: true,
    },

    // **Developers only need to edit below here**

    // ### Testing
    // Used when developing Ghost to run tests and check the health of Ghost
    // Uses a different port number
    testing: {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-test.db')
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    },

    // ### Testing MySQL
    // Used by Travis - Automated testing run through GitHub
    'testing-mysql': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'mysql',
            connection: {
                host     : '127.0.0.1',
                user     : 'root',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    },

    // ### Testing pg
    // Used by Travis - Automated testing run through GitHub
    'testing-pg': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'pg',
            connection: {
                host     : '127.0.0.1',
                user     : 'postgres',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    }
};

// Export config
module.exports = config;
