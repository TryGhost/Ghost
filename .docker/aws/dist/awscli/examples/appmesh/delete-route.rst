**To delete a route**

The following ``delete-route`` example deletes the specified route. ::

    aws appmesh delete-route \
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
                "lastUpdatedAt": 1563823915.936,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 3
            },
            "routeName": "toVnServiceB-weighted",
            "spec": {
                "httpRoute": {
                    "action": {
                        "weightedTargets": [
                            {
                                "virtualNode": "vnServiceBv1",
                                "weight": 80
                            },
                            {
                                "virtualNode": "vnServiceBv2",
                                "weight": 20
                            }
                        ]
                    },
                    "match": {
                        "prefix": "/"
                    }
                }
            },
            "status": {
                "status": "DELETED"
            },
            "virtualRouterName": "vrServiceB"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html>`__ in the *AWS App Mesh User Guide*.
