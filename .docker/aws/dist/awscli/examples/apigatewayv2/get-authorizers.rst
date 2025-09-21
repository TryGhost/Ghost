**To retrieve a list of authorizers for an API**

The following ``get-authorizers`` example displays a list of all of the authorizers for an API. ::

    aws apigatewayv2 get-authorizers \
        --api-id a1b2c3d4

Output::

    {
        "Items": [
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
            },
            {
                "AuthorizerId": "a1b2c4",
                "AuthorizerType": "JWT",
                "IdentitySource": [
                    "$request.header.Authorization"
                ],
                "JwtConfiguration": {
                    "Audience": [
                        "6789abcde"
                    ],
                    "Issuer": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_abc234"
                },
                "Name": "new-jwt-authorizer"
            }
        ]
    }

For more information, see `Controlling access to HTTP APIs with JWT authorizers <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html>`__ in the *Amazon API Gateway Developer Guide*.
