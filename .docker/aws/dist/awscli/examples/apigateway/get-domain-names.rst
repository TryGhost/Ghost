**Example 1: To get a list of custom domain names**

The following ``get-domain-names`` command gets a list of domain names. ::

    aws apigateway get-domain-names

Output::

    {
        "items": [
            {
                "distributionDomainName": "d9511k3l09bkd.cloudfront.net", 
                "certificateUploadDate": 1452812505, 
                "certificateName": "my_custom_domain-certificate", 
                "domainName": "subdomain.domain.tld"
            }
        ]
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 2: To get a list of custom domain names owned by this AWS account**

The following ``get-domain-names`` command gets a list of domain names owned by this AWS account. ::

    aws apigateway get-domain-names \
        --resource-owner SELF

Output::

    {
        "items": [
            {
                "domainName": "my.domain.tld",
                "domainNameArn": "arn:aws:apigateway:us-east-1::/domainnames/my.private.domain.tld",
                "certificateUploadDate": "2024-08-15T17:02:55-07:00",
                "regionalDomainName": "d-abcd1234.execute-api.us-east-1.amazonaws.com",
                "regionalHostedZoneId": "Z1UJRXOUMOOFQ8",
                "regionalCertificateArn": "arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3",
                "endpointConfiguration": {
                    "types": [
                        "REGIONAL"
                    ]
                },
                "domainNameStatus": "AVAILABLE",
                "securityPolicy": "TLS_1_2"
            },
            {
                "domainName": "my.private.domain.tld",
                "domainNameId": "abcd1234",
                "domainNameArn": "arn:aws:apigateway:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234",
                "certificateArn": "arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3",
                "certificateUploadDate": "2024-11-26T11:44:40-08:00",
                "endpointConfiguration": {
                    "types": [
                        "PRIVATE"
                    ]
                },
                "domainNameStatus": "AVAILABLE",
                "securityPolicy": "TLS_1_2"
            }
        ]
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 3: To get a list of custom domain names owned by other AWS accounts that you can create a domain name access association with.**

The following ``get-domain-names`` command gets a list of domain names owned by other AWS accounts that you have access to create a domain name access association with. ::

    aws apigateway get-domain-names \
        --resource-owner OTHER_ACCOUNTS

Output::

    {
        "items": [
            {
                "domainName": "my.private.domain.tld",
                "domainNameId": "abcd1234",
                "domainNameArn": "arn:aws:apigateway:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234"
            }
        ]
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.