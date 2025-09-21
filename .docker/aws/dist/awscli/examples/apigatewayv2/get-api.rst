**To retrieve information about an API**

The following ``get-api`` example displays information about an API. ::

    aws apigatewayv2 get-api \
        --api-id a1b2c3d4

Output::

    {
        "ApiEndpoint": "https://a1b2c3d4.execute-api.us-west-2.amazonaws.com",
        "ApiId": "a1b2c3d4",
        "ApiKeySelectionExpression": "$request.header.x-api-key",
        "CreatedDate": "2020-03-28T00:32:37Z",
        "Name": "my-api",
        "ProtocolType": "HTTP",
        "RouteSelectionExpression": "$request.method $request.path",
        "Tags": {
            "department": "finance"
        }
    }
