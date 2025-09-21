**To create a $default route for a WebSocket or HTTP API**

The following ``create-route`` example creates a ``$default`` route for a WebSocket or HTTP API. ::

    aws apigatewayv2 create-route \
        --api-id aabbccddee \
        --route-key '$default'

Output::

    {
        "ApiKeyRequired": false,
        "AuthorizationType": "NONE",
        "RouteKey": "$default",
        "RouteId": "1122334"
    }

For more information, see `Working with routes for WebSocket APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-add-route.html>`__ in the *Amazon API Gateway Developer Guide*

**To create a route for an HTTP API**

The following ``create-route`` example creates a route named ``signup`` that accepts POST requests. ::

    aws apigatewayv2 create-route \
        --api-id aabbccddee \
        --route-key 'POST /signup'

Output::

    {
        "ApiKeyRequired": false,
        "AuthorizationType": "NONE",
        "RouteKey": "POST /signup",
        "RouteId": "1122334"
    }

For more information, see `Working with routes for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html>`__ in the *Amazon API Gateway Developer Guide*
