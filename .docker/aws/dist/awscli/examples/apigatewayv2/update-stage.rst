**To configure custom throttling**

The following ``update-stage`` example configures custom throttling for the specified stage and route of an API. ::

    aws apigatewayv2 update-stage \
        --api-id a1b2c3d4 \
        --stage-name dev \
        --route-settings '{"GET /pets":{"ThrottlingBurstLimit":100,"ThrottlingRateLimit":2000}}'

Output::

    {    
        "CreatedDate": "2020-04-05T16:21:16+00:00",    
        "DefaultRouteSettings": {
            "DetailedMetricsEnabled": false
        },
        "DeploymentId": "shktxb",
        "LastUpdatedDate": "2020-04-08T22:23:17+00:00",
        "RouteSettings": {
            "GET /pets": {
                "ThrottlingBurstLimit": 100,
                "ThrottlingRateLimit": 2000.0
            }
        },
        "StageName": "dev",
        "StageVariables": {},
        "Tags": {}
    }

For more information, see `Protecting your HTTP API <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-protect.html>`__ in the *Amazon API Gateway Developer Guide*.
