**To update a virtual service**

The following ``update-virtual-service`` example uses a JSON input file to update a virtual service to use a virtual router provider. ::

    aws appmesh update-virtual-service \
        --cli-input-json file://update-virtual-service.json

Contents of ``update-virtual-service.json``::

    {
        "meshName": "app1",
        "spec": {
            "provider": {
                "virtualRouter": {
                    "virtualRouterName": "vrServiceA"
                }
            }
        },
        "virtualServiceName": "serviceA.svc.cluster.local"
    }

Output::

    {
        "virtualService": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualService/serviceA.svc.cluster.local",
                "createdAt": 1563810859.474,
                "lastUpdatedAt": 1563820257.411,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 3
            },
            "spec": {
                "provider": {
                    "virtualRouter": {
                        "virtualRouterName": "vrServiceA"
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualServiceName": "serviceA.svc.cluster.local"
        }
    }

For more information, see `Virtual Services <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html>`__ in the *AWS App Mesh User Guide*.
