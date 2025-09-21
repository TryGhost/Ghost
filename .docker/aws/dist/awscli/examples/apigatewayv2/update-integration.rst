**To update a Lambda integration**

The following ``update-integration`` example updates an existing AWS Lambda integration to use the specified Lambda function. ::

    aws apigatewayv2 update-integration \
        --api-id a1b2c3d4 \
        --integration-id a1b2c3 \
        --integration-uri arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123456789012:function:my-new-function/invocations

Output::

    {
        "ConnectionType": "INTERNET",
        "IntegrationId": "a1b2c3",
        "IntegrationMethod": "POST",
        "IntegrationType": "AWS_PROXY",
        "IntegrationUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123456789012:function:my-new-function/invocations",
        "PayloadFormatVersion": "2.0",
        "TimeoutInMillis": 5000
    }

For more information, see `Configuring integrations for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations.html>`__ and `Setting up WebSocket API integrations <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integrations.html>`__ in the *Amazon API Gateway Developer Guide*.
