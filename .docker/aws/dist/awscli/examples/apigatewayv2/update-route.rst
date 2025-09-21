**Example 1: To update the integration of a route**

The following ``update-route`` example updates the integration of a specified route. ::

    aws apigatewayv2 update-route \
        --api-id a1b2c3d4 \
        --route-id a1b2c3 \
        --target integrations/a1b2c6

Output::
    
    {
        "ApiKeyRequired": false,
        "AuthorizationType": "NONE",
        "RouteId": "a1b2c3",
        "RouteKey": "ANY /pets",
        "Target": "integrations/a1b2c6"
    }

**Example 2: To add an authorizer to a route**

The following ``update-route`` example updates the specified route to use a JWT authorizer. ::

    aws apigatewayv2 update-route \
        --api-id a1b2c3d4  \
        --route-id a1b2c3  \
        --authorization-type JWT \
        --authorizer-id a1b2c5 \
        --authorization-scopes user.id user.email

Output::

    {
        "ApiKeyRequired": false,
        "AuthorizationScopes": [
            "user.id",
            "user.email"
        ],
        "AuthorizationType": "JWT",
        "AuthorizerId": "a1b2c5",
        "OperationName": "GET HTTP",
        "RequestParameters": {},
        "RouteId": "a1b2c3",
        "RouteKey": "GET /pets",
        "Target": "integrations/a1b2c6"
    }

For more information, see `Controlling access to HTTP APIs with JWT authorizers <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html>`__ in the *Amazon API Gateway Developer Guide*.