**To retrieve a list of integrations**

The following ``get-integrations`` example displays a list of all of an API's integrations. ::

    aws apigatewayv2 get-integrations \
        --api-id a1b2c3d4

Output::

    {
        "Items": [
            {
                "ApiGatewayManaged": true,
                "ConnectionType": "INTERNET",
                "IntegrationId": "a1b2c3",
                "IntegrationMethod": "POST",
                "IntegrationType": "AWS_PROXY",
                "IntegrationUri": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
                "PayloadFormatVersion": "2.0",
                "TimeoutInMillis": 30000
            },
            {
                "ConnectionType": "INTERNET",
                "IntegrationId": "a1b2c4",
                "IntegrationMethod": "ANY",
                "IntegrationType": "HTTP_PROXY",
                "IntegrationUri": "https://www.example.com",
                "PayloadFormatVersion": "1.0",
                "TimeoutInMillis": 30000
            }
        ]
    }

For more information, see `Configuring integrations for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations.html>`__ and `Setting up WebSocket API integrations <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integrations.html>`__ in the *Amazon API Gateway Developer Guide*.
