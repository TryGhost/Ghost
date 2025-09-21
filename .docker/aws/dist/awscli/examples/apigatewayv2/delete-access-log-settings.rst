**To disable access logging for an API**

The following ``delete-access-log-settings`` example deletes the access log settings for the ``$default`` stage of an API. To disable access logging for a stage, delete its access log settings. ::

    aws apigatewayv2 delete-access-log-settings \
        --api-id a1b2c3d4 \
        --stage-name '$default'

This command produces no output.

For more information, see `Configuring logging for an HTTP API <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html>`__ in the *Amazon API Gateway Developer Guide*.