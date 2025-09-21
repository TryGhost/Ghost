**To update a virtual router**

The following ``update-virtual-router`` example uses a JSON input file to update a virtual router listener port. ::

    aws appmesh update-virtual-router \
        --cli-input-json file://update-virtual-router.json

Contents of ``update-virtual-router.json``::

    {
        "meshName": "app1",
        "spec": {
            "listeners": [
                {
                    "portMapping": {
                        "port": 8080,
                        "protocol": "http"
                    }
                }
            ]
        },
        "virtualRouterName": "vrServiceB"
    }

Output::

    {
        "virtualRouter": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB",
                "createdAt": 1563810546.59,
                "lastUpdatedAt": 1563819431.352,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
            },
            "spec": {
                "listeners": [
                    {
                        "portMapping": {
                            "port": 8080,
                            "protocol": "http"
                        }
                    }
                ]
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualRouterName": "vrServiceB"
        }
    }

For more information, see `Virtual Routers <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_routers.html>`__ in the *AWS App Mesh User Guide*.
