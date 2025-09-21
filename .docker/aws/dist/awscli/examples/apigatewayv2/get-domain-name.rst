**To retrieve information about a custom domain name**

The following ``get-domain-name`` example displays information about a custom domain name. ::

    aws apigatewayv2 get-domain-name \
        --domain-name api.example.com

Output::

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
        ],
        "Tags": {}
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
