**To retrieve a list of deployments**

The following ``get-deployments`` example displays a list of all of an API's deployments. ::

    aws apigatewayv2 get-deployments \
        --api-id a1b2c3d4

Output::

    {
        "Items": [
            {
                "AutoDeployed": true,
                "CreatedDate": "2020-04-07T23:58:40Z",
                "DeploymentId": "abcdef",
                "DeploymentStatus": "DEPLOYED",
                "Description": "Automatic deployment triggered by changes to the Api configuration"
            },
            {
                "AutoDeployed": true,
                "CreatedDate": "2020-04-06T00:33:00Z",
                "DeploymentId": "bcdefg",
                "DeploymentStatus": "DEPLOYED",
                "Description": "Automatic deployment triggered by changes to the Api configuration"
            }
        ]
    }

For more information, see `API deployment <https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html#apigateway-definition-api-deployment>`__ in the *Amazon API Gateway Developer Guide*.
