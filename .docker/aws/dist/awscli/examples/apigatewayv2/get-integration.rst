**To retrieve information about an integration**

The following ``get-integration`` example displays information about an integration. ::

    aws apigatewayv2 get-integration \
        --api-id a1b2c3d4 \
        --integration-id a1b2c3

Output::

    {
        "ApiGatewayManaged": true,
        "ConnectionType": "INTERNET",
        "IntegrationId": "a1b2c3",
        "IntegrationMethod": "POST",
        "IntegrationType": "AWS_PROXY",
        "IntegrationUri": "arn:aws:lambda:us-west-2:12356789012:function:hello12",
        "PayloadFormatVersion": "2.0",
        "TimeoutInMillis": 30000
    }

For more information, see `Configuring integrations for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations.html>`__ and `Setting up WebSocket API integrations <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integrations.html>`__ in the *Amazon API Gateway Developer Guide*.
