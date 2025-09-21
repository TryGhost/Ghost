**To retrieve a list of APIs**

The following ``get-apis`` example lists all of the APIs for the current user. ::

    aws apigatewayv2 get-apis

Output::

    {
        "Items": [
            {
                "ApiEndpoint": "wss://a1b2c3d4.execute-api.us-west-2.amazonaws.com",
                "ApiId": "a1b2c3d4",
                "ApiKeySelectionExpression": "$request.header.x-api-key",
                "CreatedDate": "2020-04-07T20:21:59Z",
                "Name": "my-websocket-api",
                "ProtocolType": "WEBSOCKET",
                "RouteSelectionExpression": "$request.body.message",
                "Tags": {}
            },
            {
                "ApiEndpoint": "https://a1b2c3d5.execute-api.us-west-2.amazonaws.com",
                "ApiId": "a1b2c3d5",
                "ApiKeySelectionExpression": "$request.header.x-api-key",
                "CreatedDate": "2020-04-07T20:23:50Z",
                "Name": "my-http-api",
                "ProtocolType": "HTTP",
                "RouteSelectionExpression": "$request.method $request.path",
                "Tags": {}
            }
        ]
    }

For more information, see `Working with HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html>`__ and `Working with WebSocket APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html>`__ in the *Amazon API Gateway Developer Guide*.
