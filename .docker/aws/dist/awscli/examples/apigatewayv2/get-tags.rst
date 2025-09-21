**To retrieve a list of tags for a resource**

The following ``get-tags`` example lists all of an API's tags. ::

    aws apigatewayv2 get-tags \
        --resource-arn arn:aws:apigateway:us-west-2::/apis/a1b2c3d4

Output::

    {
        "Tags": {
            "owner": "dev-team",
            "environment": "prod"
        }
    }

For more information, see `Tagging your API Gateway resources <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-tagging.html>`__ in the *Amazon API Gateway Developer Guide*.
