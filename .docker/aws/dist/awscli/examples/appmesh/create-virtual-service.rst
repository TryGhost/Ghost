**Example 1: To create a new virtual service with a virtual node provider**

The following ``create-virtual-service`` example uses a JSON input file to create a virtual service with a virtual node provider. ::

    aws appmesh create-virtual-service \
        --cli-input-json file://create-virtual-service-virtual-node.json

Contents of ``create-virtual-service-virtual-node.json``::

   {
       "meshName": "app1",
       "spec": {
           "provider": {
               "virtualNode": {
                   "virtualNodeName": "vnServiceA"
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
               "lastUpdatedAt": 1563810967.179,
               "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
               "version": 2
           },
           "spec": {
               "provider": {
                   "virtualNode": {
                       "virtualNodeName": "vnServiceA"
                   }
               }
           },
           "status": {
               "status": "ACTIVE"
           },
           "virtualServiceName": "serviceA.svc.cluster.local"
       }
   }

For more information, see `Virtual Node <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html>`__ in the *AWS App Mesh User Guide*.

**Example 2: To create a new virtual service with a virtual router provider**

The following ``create-virtual-service`` example uses a JSON input file to create a virtual service with a virtual router provider. ::

    aws appmesh create-virtual-service \
        --cli-input-json file://create-virtual-service-virtual-router.json

Contents of ``create-virtual-service-virtual-router.json``::

    {
        "meshName": "app1",
        "spec": {
            "provider": {
                "virtualRouter": {
                    "virtualRouterName": "vrServiceB"
                }
            }
        },
        "virtualServiceName": "serviceB.svc.cluster.local"
    }

Output::

    {
        "virtualService": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualService/serviceB.svc.cluster.local",
                "createdAt": 1563908363.999,
                "lastUpdatedAt": 1563908363.999,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {
                "provider": {
                    "virtualRouter": {
                        "virtualRouterName": "vrServiceB"
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualServiceName": "serviceB.svc.cluster.local"
        }
    }

For more information, see `Virtual Services<https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html>`__ in the *AWS App Mesh User Guide*