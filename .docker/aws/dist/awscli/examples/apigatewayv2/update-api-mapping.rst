**To update an API mapping**

The following ``update-api-mapping`` example changes an API mapping for a custom domain name. As a result, the base URL using the custom domain name for the specified API and stage becomes ``https://api.example.com/dev``. ::

    aws apigatewayv2 update-api-mapping \
        --api-id a1b2c3d4 \
        --stage dev \
        --domain-name api.example.com \
        --api-mapping-id 0qzs2sy7bh \
        --api-mapping-key dev

Output::

    {
        "ApiId": "a1b2c3d4",
        "ApiMappingId": "0qzs2sy7bh",
        "ApiMappingKey": "dev"
        "Stage": "dev"
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
