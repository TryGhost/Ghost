**To enable CORS for an HTTP API**

The following ``update-api`` example updates the specified API's CORS configuration to allow requests from ``https://www.example.com``. ::

    aws apigatewayv2 update-api \
        --api-id a1b2c3d4 \
        --cors-configuration AllowOrigins=https://www.example.com

Output::

    {    
        "ApiEndpoint": "https://a1b2c3d4.execute-api.us-west-2.amazonaws.com",    
        "ApiId": "a1b2c3d4",
        "ApiKeySelectionExpression": "$request.header.x-api-key",
        "CorsConfiguration": {
            "AllowCredentials": false,
            "AllowHeaders": [
                "header1",
                "header2"
            ],
            "AllowMethods": [
                "GET",
                "OPTIONS"
            ],
            "AllowOrigins": [
                "https://www.example.com"
            ]
        },
        "CreatedDate": "2020-04-08T18:39:37+00:00",
        "Name": "my-http-api",
        "ProtocolType": "HTTP",
        "RouteSelectionExpression": "$request.method $request.path",
        "Tags": {},
        "Version": "v1.0"
    }

For more information, see `Configuring CORS for an HTTP API <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html>`__ in the *Amazon API Gateway Developer Guide*.
