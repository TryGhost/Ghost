**To flush the cache for an API's stage**

The following ``flush-stage-cache`` example flushes the cache of a stage. ::

    aws apigateway flush-stage-cache \
        --rest-api-id 1234123412 \
        --stage-name dev

This command produces no output.

For more information, see `Flush the API stage cache in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html#flush-api-caching>`_ in the *Amazon API Gateway Developer Guide*.
