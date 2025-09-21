**Example 1: To create a public custom domain name**

The following ``create-domain-name`` example creates a public custom domain name. ::

    aws apigateway create-domain-name \
        --domain-name 'my.domain.tld' \
        --certificate-name 'my.domain.tld cert'\
        --certificate-arn 'arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3'

Output::

    {
        "domainName": "my.domain.tld",
        "certificateName": "my.domain.tld cert",
        "certificateArn": "arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3",
        "certificateUploadDate": "2024-10-08T11:29:49-07:00",
        "distributionDomainName": "abcd1234.cloudfront.net",
        "distributionHostedZoneId": "Z2FDTNDATAQYW2",
        "endpointConfiguration": {
            "types": [
                "EDGE"
            ]
        },
        "domainNameStatus": "AVAILABLE",
        "securityPolicy": "TLS_1_2"
    }

For more information, see `Custom domain name for public REST APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 2: To create a private custom domain name**

The following ``create-domain-name`` example creates a private custom domain name. ::

    aws apigateway create-domain-name \
        --domain-name 'my.private.domain.tld' \
        --certificate-name 'my.domain.tld cert' \
        --certificate-arn 'arn:aws:acm:us-east-1:012345678910:certificate/fb1b9770-a305-495d-aefb-27e5e101ff3' \
        --endpoint-configuration '{"types": ["PRIVATE"]}' \
        --security-policy 'TLS_1_2' \
        --policy file://policy.json

Contents of ``policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "execute-api:/*"
                ]
            },
            {
                "Effect": "Deny",
                "Principal": "*",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "execute-api:/*"
                ],
                "Condition" : {
                    "StringNotEquals": {
                        "aws:SourceVpce": "vpce-abcd1234efg"
                    }
                }
            }
        ]
    }

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
