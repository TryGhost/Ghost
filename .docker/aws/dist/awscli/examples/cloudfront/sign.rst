**To sign a CloudFront URL**

The following example signs a CloudFront URL. To sign a URL, you need the key
pair ID (called the **Access Key ID** in the AWS Management Console) and the
private key of the trusted signer's CloudFront key pair. For more information
about signed URLs, see `Serving Private Content with Signed URLs and Signed
Cookies
<https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html>`_
in the *Amazon CloudFront Developer Guide*.

::

    aws cloudfront sign \
        --url https://d111111abcdef8.cloudfront.net/private-content/private-file.html \
        --key-pair-id APKAEIBAERJR2EXAMPLE \
        --private-key file://cf-signer-priv-key.pem \
        --date-less-than 2020-01-01

Output::

    https://d111111abcdef8.cloudfront.net/private-content/private-file.html?Expires=1577836800&Signature=nEXK7Kby47XKeZQKVc6pwkif6oZc-JWSpDkH0UH7EBGGqvgurkecCbgL5VfUAXyLQuJxFwRQWscz-owcq9KpmewCXrXQbPaJZNi9XSNwf4YKurPDQYaRQawKoeenH0GFteRf9ELK-Bs3nljTLjtbgzIUt7QJNKXcWr8AuUYikzGdJ4-qzx6WnxXfH~fxg4-GGl6l2kgCpXUB6Jx6K~Y3kpVOdzUPOIqFLHAnJojbhxqrVejomZZ2XrquDvNUCCIbePGnR3d24UPaLXG4FKOqNEaWDIBXu7jUUPwOyQCvpt-GNvjRJxqWf93uMobeMOiVYahb-e0KItiQewGcm0eLZQ__&Key-Pair-Id=APKAEIBAERJR2EXAMPLE
