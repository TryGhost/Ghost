**To list routes**

The following ``list-routes`` example lists all of the routes for the specified virtual router. ::

    aws appmesh list-routes \
        --mesh-name app1 \
        --virtual-router-name vrServiceB

Output::

    {
        "routes": [
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB/route/toVnServiceB",
                "meshName": "app1",
                "routeName": "toVnServiceB-weighted",
                "virtualRouterName": "vrServiceB"
            }
        ]
    }

For more information, see `Routes <https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html>`__ in the *AWS App Mesh User Guide*.
