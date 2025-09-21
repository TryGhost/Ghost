**To describe a route**

The following ``describe-route`` example returns details about the specified route. ::

    aws appmesh describe-route \
        --mesh-name app1 \
        --virtual-router-name vrServiceB \
        --route-name toVnServiceB-weighted

Output::

    {
        "route": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB/route/toVnServiceB-weighted",
                "createdAt": 1563811384.015,
                "lastUpdatedAt": 1563811384.015,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "routeName": "toVnServiceB-weighted",
            "spec": {
                "httpRoute": {
                    "action": {
                        "weightedTargets": [
                            {
                                "virtualNode": "vnServiceBv1",
                                "weight": 90
                            },
                            {
                                "virtualNode": "vnServiceBv2",
                                "weight": 10
                            }
                        ]
                    },
                    "match": {
                        "prefix": "/"
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualRouterName": "vrServiceB"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html>`__ in the *AWS App Mesh User Guide*.
