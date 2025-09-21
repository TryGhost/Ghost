**To delete an integration**

The following ``delete-integration`` example deletes an API integration. ::

    aws apigatewayv2 delete-integration \
        --api-id a1b2c3d4 \
        --integration-id a1b2c3

This command produces no output.

For more information, see `Configuring integrations for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations.html>`__ and `Setting up WebSocket API integrations <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integrations.html>`__ in the *Amazon API Gateway Developer Guide*.
