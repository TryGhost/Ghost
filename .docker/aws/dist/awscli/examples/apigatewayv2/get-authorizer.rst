**To retrieve information about an authorizer**

The following ``get-authorizer`` example displays information about an authorizer. ::

    aws apigatewayv2 get-authorizer \
        --api-id a1b2c3d4 \
        --authorizer-id a1b2c3

Output::

    {
        "AuthorizerId": "a1b2c3",
        "AuthorizerType": "JWT",
        "IdentitySource": [
            "$request.header.Authorization"
        ],
        "JwtConfiguration": {
            "Audience": [
                "123456abc"
            ],
            "Issuer": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_abc123"
        },
        "Name": "my-jwt-authorizer"
    }

For more information, see `Controlling access to HTTP APIs with JWT authorizers <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html>`__ in the *Amazon API Gateway Developer Guide*.
