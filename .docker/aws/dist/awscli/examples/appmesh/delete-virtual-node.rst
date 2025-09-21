**To delete a virtual node**

The following ``delete-virtual-node`` example deletes the specified virtual node. ::

    aws appmesh delete-virtual-node \
        --mesh-name app1 \
        --virtual-node-name vnServiceBv2

Output::

    {
        "virtualNode": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceBv2",
                "createdAt": 1563810117.297,
                "lastUpdatedAt": 1563824700.678,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
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
                        "hostname": "serviceBv2.svc.cluster.local"
                    }
                }
            },
            "status": {
                "status": "DELETED"
            },
            "virtualNodeName": "vnServiceBv2"
        }
    }

For more information, see `Virtual Nodes <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html>`__ in the *AWS App Mesh User Guide*.
