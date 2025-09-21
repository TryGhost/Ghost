**To send data to a WebSocket connection**

The following ``post-to-connection`` example sends a message to a client that's connected to the specified WebSocket API. ::

    aws apigatewaymanagementapi post-to-connection \
        --connection-id L0SM9cOFvHcCIhw= \
        --data 'SGVsbG8gZnJvbSBBUEkgR2F0ZXdheSE=' \
        --endpoint-url https://aabbccddee.execute-api.us-west-2.amazonaws.com/prod

This command produces no output.

For more information, see `Use @connections commands in your backend service <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html>`__ in the *Amazon API Gateway Developer Guide*.
