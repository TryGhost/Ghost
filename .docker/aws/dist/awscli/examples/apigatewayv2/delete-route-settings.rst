**To delete route settings**

The following ``delete-route-settings`` example deletes the route settings for the specified route. ::

    aws apigatewayv2 delete-route-settings \
        --api-id a1b2c3d4 \
        --stage-name dev \
        --route-key 'GET /pets'

This command produces no output.

For more information, see `Working with routes for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html>`__ in the *Amazon API Gateway Developer Guide*.
