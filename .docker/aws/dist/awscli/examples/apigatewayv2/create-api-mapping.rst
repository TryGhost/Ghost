**To create an API mapping for an API**

The following ``create-api-mapping`` example maps the ``test`` stage of an API to the ``/myApi`` path of the ``regional.example.com`` custom domain name. ::

    aws apigatewayv2 create-api-mapping \
        --domain-name regional.example.com \
        --api-mapping-key myApi \
        --api-id a1b2c3d4 \
        --stage test

Output::

    {
        "ApiId": "a1b2c3d4",
        "ApiMappingId": "0qzs2sy7bh",
        "ApiMappingKey": "myApi"
        "Stage": "test"
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
