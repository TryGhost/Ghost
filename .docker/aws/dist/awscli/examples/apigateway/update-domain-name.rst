**To change the certificate name for a custom domain name**

The following ``update-domain-name`` example changes the certificate name for a custom domain. ::

    aws apigateway update-domain-name \
        --domain-name api.domain.tld \
        --patch-operations op='replace',path='/certificateArn',value='arn:aws:acm:us-west-2:111122223333:certificate/CERTEXAMPLE123EXAMPLE'

Output::

    {
        "domainName": "api.domain.tld",
        "distributionDomainName": "d123456789012.cloudfront.net",
        "certificateArn": "arn:aws:acm:us-west-2:111122223333:certificate/CERTEXAMPLE123EXAMPLE",
        "certificateUploadDate": 1462565487
    }

For more information, see `Set up Custom Domain Name for an API in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html>`_ in the *Amazon API Gateway Developer Guide*.
