**To update a virtual node**

The following ``update-virtual-node`` example uses a JSON input file to add a health check to a virtual node. ::

    aws appmesh update-virtual-node \
        --cli-input-json file://update-virtual-node.json

Contents of ``update-virtual-node.json``::

    {
        "clientToken": "500",
        "meshName": "app1",
        "spec": {
            "listeners": [
                {
                    "healthCheck": {
                        "healthyThreshold": 5,
                        "intervalMillis": 10000,
                        "path": "/",
                        "port": 80,
                        "protocol": "http",
                        "timeoutMillis": 3000,
                        "unhealthyThreshold": 3
                    },
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
        "virtualNodeName": "vnServiceBv1"
    }

Output::

    {
        "virtualNode": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceBv1",
                "createdAt": 1563810019.874,
                "lastUpdatedAt": 1563819234.825,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
            },
            "spec": {
                "listeners": [
                    {
                        "healthCheck": {
                            "healthyThreshold": 5,
                            "intervalMillis": 10000,
                            "path": "/",
                            "port": 80,
                            "protocol": "http",
                            "timeoutMillis": 3000,
                            "unhealthyThreshold": 3
                        },
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
