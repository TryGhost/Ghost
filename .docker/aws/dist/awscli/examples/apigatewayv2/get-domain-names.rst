**To retrieve a list of custom domain names**

The following ``get-domain-names`` example displays a list of all of the custom domain names for the current user. ::

    aws apigatewayv2 get-domain-names

Output::

    {
        "Items": [
            {
                "ApiMappingSelectionExpression": "$request.basepath",
                "DomainName": "api.example.com",
                "DomainNameConfigurations": [
                    {
                        "ApiGatewayDomainName": "d-1234.execute-api.us-west-2.amazonaws.com",
                        "CertificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/123456789012-1234-1234-1234-12345678",
                        "EndpointType": "REGIONAL",
                        "HostedZoneId": "123456789111",
                        "SecurityPolicy": "TLS_1_2",
                        "DomainNameStatus": "AVAILABLE"
                    }
                ]
            },
            {
                "ApiMappingSelectionExpression": "$request.basepath",
                "DomainName": "newApi.example.com",
                "DomainNameConfigurations": [
                    {
                        "ApiGatewayDomainName": "d-5678.execute-api.us-west-2.amazonaws.com",
                        "CertificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/123456789012-1234-1234-1234-12345678",
                        "EndpointType": "REGIONAL",
                        "HostedZoneId": "123456789222",
                        "SecurityPolicy": "TLS_1_2",
                        "DomainNameStatus": "AVAILABLE"
                    }
                ]
            }
        ]
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
