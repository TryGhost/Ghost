**Example 1: To get information about a public custom domain name**

The following ``get-domain-name`` example gets information about a public custom domain name. ::

    aws apigateway get-domain-name \
        --domain-name api.domain.tld

Output::

    {
        "domainName": "api.domain.tld", 
        "distributionDomainName": "d1a2f3a4c5o6d.cloudfront.net", 
        "certificateName": "uploadedCertificate", 
        "certificateUploadDate": 1462565487
    }

For more information, see `Custom domain name for public REST APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 2: To get information about a private custom domain name**

The following ``get-domain-name`` example gets information about a private custom domain name. ::

    aws apigateway get-domain-name \
        --domain-name api.private.domain.tld \
        --domain-name-id abcd1234

Output::

    {
        "domainName": "my.private.domain.tld",
        "domainNameId": "abcd1234",
        "domainNameArn": "arn:aws:apigateway:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234",
        "certificateArn": "arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3",
        "certificateUploadDate": "2024-09-10T10:31:20-07:00",
        "endpointConfiguration": {
            "types": [
                "PRIVATE"
            ]
        },
        "domainNameStatus": "AVAILABLE",
        "securityPolicy": "TLS_1_2",
        "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"execute-api:Invoke\",\"Resource\":\"arn:aws:execute-api:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234\"},{\"Effect\":\"Deny\",\"Principal\":\"*\",\"Action\":\"execute-api:Invoke\",\"Resource\":\"arn:aws:execute-api:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234\",\"Condition\":{\"StringNotEquals\":{\"aws:SourceVpc\":\"vpc-1a2b3c4d\"}}}]}"
    }

For more information, see `Custom domain name for public REST APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.
