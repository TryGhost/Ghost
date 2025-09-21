**To retrieve a list of routes**

The following ``get-routes`` example displays a list of all of an API's routes. ::

    aws apigatewayv2 get-routes \
        --api-id a1b2c3d4

Output::

    {
        "Items": [
            {
                "ApiKeyRequired": false,
                "AuthorizationType": "NONE",
                "RouteId": "72jz1wk",
                "RouteKey": "ANY /admin",
                "Target": "integrations/a1b2c3"
            },
            {
                "ApiGatewayManaged": true,
                "ApiKeyRequired": false,
                "AuthorizationType": "NONE",
                "RouteId": "go65gqi",
                "RouteKey": "$default",
                "Target": "integrations/a1b2c4"
            }
        ]
    }

For more information, see `Working with routes for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html>`__ in the *Amazon API Gateway Developer Guide*
