**To describe a virtual node**

The following ``describe-virtual-node`` example returns details about the specified virtual node. ::

    aws appmesh describe-virtual-node \
        --mesh-name app1 \
        --virtual-node-name vnServiceBv1

Output::

    {
        "virtualNode": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceBv1",
                "createdAt": 1563810019.874,
                "lastUpdatedAt": 1563810019.874,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {
                "backends": [],
                "listeners": [
                    {
                        "portMapping": {
                            "port": 80,
                            "protocol": "http"
                        }
                    }
                ],
                "serviceDiscovery": {
                    "dns": {
                        "hostname": "serviceBv1.svc.cluster.local"
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualNodeName": "vnServiceBv1"
        }
    }

For more information, see `Virtual Nodes <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html>`__ in the *AWS App Mesh User Guide*.
