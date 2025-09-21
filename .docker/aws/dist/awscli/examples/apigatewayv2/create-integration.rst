**To create a WebSocket API integration**

The following ``create-integration`` example creates a mock integration for a WebSocket API. ::

    aws apigatewayv2 create-integration \
        --api-id aabbccddee \
        --passthrough-behavior WHEN_NO_MATCH \
        --timeout-in-millis 29000 \
        --connection-type INTERNET \
        --integration-type MOCK

Output::

    {
        "ConnectionType": "INTERNET",
        "IntegrationId": "0abcdef",
        "IntegrationResponseSelectionExpression": "${integration.response.statuscode}",
        "IntegrationType": "MOCK",
        "PassthroughBehavior": "WHEN_NO_MATCH",
        "PayloadFormatVersion": "1.0",
        "TimeoutInMillis": 29000
    }

For more information, see `Set up a WebSocket API integration request in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integration-requests.html>`__ in the *Amazon API Gateway Developer Guide*.

**To create an HTTP API integration**

The following ``create-integration`` example creates an AWS Lambda integration for an HTTP API. ::

    aws apigatewayv2 create-integration \
        --api-id a1b2c3d4 \
        --integration-type AWS_PROXY \
        --integration-uri arn:aws:lambda:us-west-2:123456789012:function:my-function \
        --payload-format-version 2.0

Output::

    {
        "ConnectionType": "INTERNET",
        "IntegrationId": "0abcdef",
        "IntegrationMethod": "POST",
        "IntegrationType": "AWS_PROXY",
        "IntegrationUri": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "PayloadFormatVersion": "2.0",
        "TimeoutInMillis": 30000
    }

For more information, see `Configuring integrations for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations.html>`__ in the *Amazon API Gateway Developer Guide*.
