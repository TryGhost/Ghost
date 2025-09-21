**To delete a WebSocket connection**

The following ``delete-connection`` example disconnects a client from the specified WebSocket API. ::

    aws apigatewaymanagementapi delete-connection \
        --connection-id L0SM9cOFvHcCIhw= \
        --endpoint-url https://aabbccddee.execute-api.us-west-2.amazonaws.com/prod

This command produces no output.

For more information, see `Use @connections commands in your backend service <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html>`__ in the *Amazon API Gateway Developer Guide*.
