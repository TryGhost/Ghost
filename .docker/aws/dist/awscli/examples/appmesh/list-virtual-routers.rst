**To list virtual routers**

The following ``list-virtual-routers`` example lists all of the virtual routers in the specified service mesh. ::

    aws appmesh list-virtual-routers \
        --mesh-name app1

Output::

    {
        "virtualRouters": [
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualRouter/vrServiceB",
                "meshName": "app1",
                "virtualRouterName": "vrServiceB"
            }
        ]
    }

For more information, see `Virtual Routers <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_routers.html>`__ in the *AWS App Mesh User Guide*.
