**To delete the CORS configuration for an HTTP API**

The following ``delete-cors-configuration`` example disables CORS for an HTTP API by deleting its CORS configuration. ::

    aws apigatewayv2 delete-cors-configuration \
        --api-id a1b2c3d4

This command produces no output.

For more information, see `Configuring CORS for an HTTP API <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html>`__ in the *Amazon API Gateway Developer Guide*.
