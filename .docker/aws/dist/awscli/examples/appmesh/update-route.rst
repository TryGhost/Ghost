**To update a route**

The following ``update-route`` example uses a JSON input file to update the weights for a route. ::

    aws appmesh update-route \
        --cli-input-json file://update-route-weighted.json

Contents of ``update-route-weighted.json``::

    {
        "meshName": "app1",
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
        "virtualRouterName": "vrServiceB"
    }

Output::

    {
        "route": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB/route/toVnServiceB-weighted",
                "createdAt": 1563811384.015,
                "lastUpdatedAt": 1563819600.022,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
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
                "status": "ACTIVE"
            },
            "virtualRouterName": "vrServiceB"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html>`__ in the *AWS App Mesh User Guide*.
