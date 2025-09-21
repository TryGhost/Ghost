**To export an OpenAPI definition of an HTTP API**

The following ``export-api`` example exports an OpenAPI 3.0 definition of an API stage named ``prod`` to a YAML file named ``stage-definition.yaml``. The exported definition file includes API Gateway extensions by default. ::

    aws apigatewayv2 export-api \
        --api-id a1b2c3d4 \
        --output-type YAML \
        --specification OAS30 \
        --stage-name prod \
        stage-definition.yaml

This command produces no output.

For more information, see `Exporting an HTTP API from API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-export.html>`__ in the *Amazon API Gateway Developer Guide*.
