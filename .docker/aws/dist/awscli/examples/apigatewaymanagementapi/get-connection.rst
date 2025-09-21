**To get information about a WebSocket connection**

The following ``get-connection`` example describes a connection to the specified WebSocket API. ::

    aws apigatewaymanagementapi get-connection \
        --connection-id L0SM9cOFvHcCIhw= \
        --endpoint-url https://aabbccddee.execute-api.us-west-2.amazonaws.com/prod

Output::

    {
        "ConnectedAt": "2020-04-30T20:10:33.236Z",
        "Identity": {
            "SourceIp": "192.0.2.1"
        },
        "LastActiveAt": "2020-04-30T20:10:42.997Z"
    }

For more information, see `Use @connections commands in your backend service <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html>`__ in the *Amazon API Gateway Developer Guide*.
