**To retrieve information about a stage**

The following ``get-stage`` example displays information about the ``prod`` stage of an API. ::

    aws apigatewayv2 get-stage \
        --api-id a1b2c3d4 \
        --stage-name prod

Output::

    {
        "CreatedDate": "2020-04-08T00:36:05Z",
        "DefaultRouteSettings": {
            "DetailedMetricsEnabled": false
        },
        "DeploymentId": "x1zwyv",
        "LastUpdatedDate": "2020-04-08T00:36:13Z",
        "RouteSettings": {},
        "StageName": "prod",
        "StageVariables": {
            "function": "my-prod-function"
        },
        "Tags": {}
    }

For more information, see `Working with stages for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html>`__ in the *Amazon API Gateway Developer Guide*.
