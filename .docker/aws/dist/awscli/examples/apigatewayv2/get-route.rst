**To retrieve information about a route**

The following ``get-route`` example displays information about a route. ::

    aws apigatewayv2 get-route \
        --api-id a1b2c3d4 \
        --route-id 72jz1wk

Output::

    {
        "ApiKeyRequired": false,
        "AuthorizationType": "NONE",
        "RouteId": "72jz1wk",
        "RouteKey": "ANY /pets",
        "Target": "integrations/a1b2c3"
    }

For more information, see `Working with routes for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html>`__ in the *Amazon API Gateway Developer Guide*
