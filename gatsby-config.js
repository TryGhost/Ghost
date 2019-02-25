module.exports = {
    siteMetadata: {
        title: 'Gatsby Default Starter'
    },
    plugins: [
        {
            resolve: 'gatsby-source-ghost',
            options: {
                apiUrl: 'http://localhost:2368',
                contentApiKey: 'a2ed553eb0b7eb18b6839901ea'
            }
        }
    ]
};