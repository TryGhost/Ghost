**To list virtual services**

The following ``list-virtual-services`` example lists all of the virtual services in the specified service mesh. ::

    aws appmesh list-virtual-services \
        --mesh-name app1

Output::

    {
        "virtualServices": [
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualService/serviceA.svc.cluster.local",
                "meshName": "app1",
                "virtualServiceName": "serviceA.svc.cluster.local"
            },
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualService/serviceB.svc.cluster.local",
                "meshName": "app1",
                "virtualServiceName": "serviceB.svc.cluster.local"
            }
        ]
    }

For more information, see `Virtual Services <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html>`__ in the *AWS App Mesh User Guide*.
