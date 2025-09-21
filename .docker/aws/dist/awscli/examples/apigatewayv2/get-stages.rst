**To retrieve a list of stages**

The following ``get-stages`` example lists all of an API's stages. ::

    aws apigatewayv2 get-stages \
        --api-id a1b2c3d4

Output::

    {
        "Items": [
            {
                "ApiGatewayManaged": true,
                "AutoDeploy": true,
                "CreatedDate": "2020-04-08T00:08:44Z",
                "DefaultRouteSettings": {
                    "DetailedMetricsEnabled": false
                },
                "DeploymentId": "dty748",
                "LastDeploymentStatusMessage": "Successfully deployed stage with deployment ID 'dty748'",
                "LastUpdatedDate": "2020-04-08T00:09:49Z",
                "RouteSettings": {},
                "StageName": "$default",
                "StageVariables": {},
                "Tags": {}
            },
            {
                "AutoDeploy": true,
                "CreatedDate": "2020-04-08T00:35:06Z",
                "DefaultRouteSettings": {
                    "DetailedMetricsEnabled": false
                },
                "LastUpdatedDate": "2020-04-08T00:35:48Z",
                "RouteSettings": {},
                "StageName": "dev",
                "StageVariables": {
                    "function": "my-dev-function"
                },
                "Tags": {}
            },
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
        ]
    }

For more information, see `Working with stages for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html>`__ in the *Amazon API Gateway Developer Guide*.
