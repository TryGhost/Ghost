**To create a new virtual gateway**

The following ``create-virtual-gateway`` example uses a JSON input file to create a virtual gateway with a listener for HTTP using port 9080. ::

    aws appmesh create-virtual-gateway \
        --mesh-name meshName \
        --virtual-gateway-name virtualGatewayName \
        --cli-input-json file://create-virtual-gateway.json

Contents of ``create-virtual-gateway.json``::

    {
        "spec": {
          "listeners": [
            {
              "portMapping": {
                "port": 9080,
                "protocol": "http"
              }
            }
          ]
        }
    }

Output::

    {
        "virtualGateway": {
            "meshName": "meshName",
            "metadata": {
                "arn": "arn:aws:appmesh:us-west-2:123456789012:mesh/meshName/virtualGateway/virtualGatewayName",
                "createdAt": "2022-04-06T10:42:42.015000-05:00",
                "lastUpdatedAt": "2022-04-06T10:42:42.015000-05:00",
                "meshOwner": "123456789012",
                "resourceOwner": "123456789012",
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {
                "listeners": [
                    {
                        "portMapping": {
                            "port": 9080,
                            "protocol": "http"
                        }
                    }
                ]
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualGatewayName": "virtualGatewayName"
        }
    }

For more information, see `Virtual Gateways <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_gateways.html>`__ in the *AWS App Mesh User Guide*.