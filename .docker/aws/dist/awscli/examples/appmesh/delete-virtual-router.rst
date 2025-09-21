**To delete a virtual router**

The following ``delete-virtual-router`` example deletes the specified virtual router. ::

    aws appmesh delete-virtual-router \
        --mesh-name app1 \
        --virtual-router-name vrServiceB

Output::

    {
        "virtualRouter": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB",
                "createdAt": 1563810546.59,
                "lastUpdatedAt": 1563824253.467,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 3
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
                "status": "DELETED"
            },
            "virtualRouterName": "vrServiceB"
        }
    }

For more information, see `Virtual Routers <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_routers.html>`__ in the *AWS App Mesh User Guide*.
