**To create an HTTP API**

The following ``create-api`` example creates an HTTP API by using quick create. You can use quick create to create an API with an AWS Lambda or HTTP integration, a default catch-all route, and a default stage that is configured to automatically deploy changes. The following command uses quick create to create an HTTP API that integrates with a Lambda function. ::

    aws apigatewayv2 create-api \
        --name my-http-api \
        --protocol-type HTTP \
        --target arn:aws:lambda:us-west-2:123456789012:function:my-lambda-function

Output::

    {
        "ApiEndpoint": "https://a1b2c3d4.execute-api.us-west-2.amazonaws.com",
        "ApiId": "a1b2c3d4",
        "ApiKeySelectionExpression": "$request.header.x-api-key",
        "CreatedDate": "2020-04-08T19:05:45+00:00",
        "Name": "my-http-api",
        "ProtocolType": "HTTP",
        "RouteSelectionExpression": "$request.method $request.path"
    }

For more information, see `Developing an HTTP API in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html>`__ in the *Amazon API Gateway Developer Guide*.

**To create a WebSocket API**

The following ``create-api`` example creates a WebSocket API with the specified name. ::

    aws apigatewayv2 create-api \
        --name "myWebSocketApi" \
        --protocol-type WEBSOCKET \
        --route-selection-expression '$request.body.action' 

Output::

    {
        "ApiKeySelectionExpression": "$request.header.x-api-key",
        "Name": "myWebSocketApi",
        "CreatedDate": "2018-11-15T06:23:51Z",
        "ProtocolType": "WEBSOCKET",
        "RouteSelectionExpression": "'$request.body.action'",
        "ApiId": "aabbccddee"
    }

For more information, see `Create a WebSocket API in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-create-empty-api.html>`__ in the *Amazon API Gateway Developer Guide*.
