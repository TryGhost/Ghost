**To describe a virtual router**

The following ``describe-virtual-router`` example returns details about the specified virtual router. ::

    aws appmesh describe-virtual-router \
        --mesh-name app1 \
        --virtual-router-name vrServiceB

Output::

    {
        "virtualRouter": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB",
                "createdAt": 1563810546.59,
                "lastUpdatedAt": 1563810546.59,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {
                "listeners": [
                    {
                        "portMapping": {
                            "port": 80,
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
