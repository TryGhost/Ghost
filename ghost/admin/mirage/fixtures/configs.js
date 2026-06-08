export default [{
    clientExtensions: {},
    database: 'mysql',
    enableDeveloperExperiments: false,
    environment: 'development',
    labs: {},
    mail: 'SMTP',
    version: '2.15.0',
    useGravatar: 'true',
    editor: {
        url: 'http://localhost:2368/editor.js'
    },
    tinybird: {
        workspaceId: '1234567890',
        adminToken: 'p.ey1234567890',
        tracker: {
            endpoint: 'https://api.tinybird.co/v0/events'
        },
        stats: {
            endpoint: 'https://api.tinybird.co'
        }
    },
    // Asset delivery configuration for stats component
    statsFilename: 'stats.js',
    statsHash: 'development'
}];
