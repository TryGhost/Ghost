**To create a deployment for an API**

The following ``create-deployment`` example creates a deployment for an API and associates that deployment with the ``dev`` stage of the API. ::

    aws apigatewayv2 create-deployment \
        --api-id a1b2c3d4 \
        --stage-name dev

Output::

    {
        "AutoDeployed": false,
        "CreatedDate": "2020-04-06T23:38:08Z",
        "DeploymentId": "53lz9l",
        "DeploymentStatus": "DEPLOYED"
    }

For more information, see `API deployment <https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html#apigateway-definition-api-deployment>`__ in the *Amazon API Gateway Developer Guide*.
