**To change a deployment's description**

The following ``update-deployment`` example updates a deployment's description. ::

    aws apigatewayv2 update-deployment \
        --api-id a1b2c3d4 \
        --deployment-id abcdef \
        --description 'Manual deployment to fix integration test failures.'

Output::

    {
        "AutoDeployed": false,
        "CreatedDate": "2020-02-05T16:21:48+00:00",
        "DeploymentId": "abcdef",
        "DeploymentStatus": "DEPLOYED",
        "Description": "Manual deployment to fix integration test failures."
    }

For more information, see `Developing an HTTP API in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html>`__ in the *Amazon API Gateway Developer Guide*.
