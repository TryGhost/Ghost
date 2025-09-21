**To create a custom domain name**

The following ``create-domain-name`` example creates a regional custom domain name for an API. ::

    aws apigatewayv2 create-domain-name \
        --domain-name regional.example.com \
        --domain-name-configurations CertificateArn=arn:aws:acm:us-west-2:123456789012:certificate/123456789012-1234-1234-1234-12345678

Output::

    {
        "ApiMappingSelectionExpression": "$request.basepath",
        "DomainName": "regional.example.com",
        "DomainNameConfigurations": [
            {
                "ApiGatewayDomainName": "d-id.execute-api.us-west-2.amazonaws.com",
                "CertificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/123456789012-1234-1234-1234-12345678",
                "EndpointType": "REGIONAL",
                "HostedZoneId": "123456789111",
                "SecurityPolicy": "TLS_1_2",
                "DomainNameStatus": "AVAILABLE"
            }
        ]
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
