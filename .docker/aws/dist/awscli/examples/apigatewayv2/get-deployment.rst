**To retrieve information about a deployment**

The following ``get-deployment`` example displays information about a deployment. ::

    aws apigatewayv2 get-deployment \
        --api-id a1b2c3d4 \
        --deployment-id abcdef

Output::

    {
        "AutoDeployed": true,
        "CreatedDate": "2020-04-07T23:58:40Z",
        "DeploymentId": "abcdef",
        "DeploymentStatus": "DEPLOYED",
        "Description": "Automatic deployment triggered by changes to the Api configuration"
    }

For more information, see `API deployment <https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html#apigateway-definition-api-deployment>`__ in the *Amazon API Gateway Developer Guide*.
