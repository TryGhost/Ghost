**To create a stage**

The following ``create-stage`` example creates a stage named `dev` for an API. ::

    aws apigatewayv2 create-stage \
        --api-id a1b2c3d4 \
        --stage-name dev

Output::

    {
        "CreatedDate": "2020-04-06T23:23:46Z",
        "DefaultRouteSettings": {
            "DetailedMetricsEnabled": false
        },
        "LastUpdatedDate": "2020-04-06T23:23:46Z",
        "RouteSettings": {},
        "StageName": "dev",
        "StageVariables": {},
        "Tags": {}
    }

For more information, see `Working with stages for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html>`__ in the *Amazon API Gateway Developer Guide*.
