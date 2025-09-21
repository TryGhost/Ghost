**To delete an authorizer**

The following ``delete-authorizer`` example deletes an authorizer. ::

    aws apigatewayv2 delete-authorizer \
        --api-id a1b2c3d4 \
        --authorizer-id a1b2c3

This command produces no output.

For more information, see `Controlling access to HTTP APIs with JWT authorizers <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html>`__ in the *Amazon API Gateway Developer Guide*.
