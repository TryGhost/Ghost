**To delete a stage**

The following ``delete-stage`` example deletes the ``test`` stage of an API. ::

    aws apigatewayv2 delete-stage \
        --api-id a1b2c3d4 \
        --stage-name test

This command produces no output.

For more information, see `Working with stages for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html>`__ in the *Amazon API Gateway Developer Guide*.
