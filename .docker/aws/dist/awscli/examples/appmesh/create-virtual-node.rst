**Example 1: To create a new virtual node that uses DNS for discovery**

The following ``create-virtual-node`` example uses a JSON input file to create a virtual node that uses DNS for service discovery. ::

    aws appmesh create-virtual-node \
        --cli-input-json file://create-virtual-node-dns.json

Contents of ``create-virtual-node-dns.json``::

    {
        "meshName": "app1",
        "spec": {
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
        "virtualNodeName": "vnServiceBv1"
    }

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

**Example 2: To create a new virtual node that uses AWS Cloud Map for discovery**

The following ``create-virtual-node`` example uses a JSON input file to create a virtual node that uses AWS Cloud Map for service discovery. ::

    aws appmesh create-virtual-node \
        --cli-input-json file://create-virtual-node-cloud-map.json

Contents of ``create-virtual-node-cloud-map.json``::

    {
        "meshName": "app1",
        "spec": {
            "backends": [
                {
                    "virtualService": {
                        "virtualServiceName": "serviceA.svc.cluster.local"
                    }
                }
            ],
            "listeners": [
                {
                    "portMapping": {
                        "port": 80,
                        "protocol": "http"
                    }
                }
            ],
            "serviceDiscovery": {
                "awsCloudMap": {
                    "attributes": [
                        {
                            "key": "Environment",
                            "value": "Testing"
                        }
                    ],
                    "namespaceName": "namespace1",
                    "serviceName": "serviceA"
                }
            }
        },
        "virtualNodeName": "vnServiceA"
    }

Output::

    {
        "virtualNode": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceA",
                "createdAt": 1563810859.465,
                "lastUpdatedAt": 1563810859.465,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {
                "backends": [
                    {
                        "virtualService": {
                            "virtualServiceName": "serviceA.svc.cluster.local"
                        }
                    }
                ],
                "listeners": [
                    {
                        "portMapping": {
                            "port": 80,
                            "protocol": "http"
                        }
                    }
                ],
                "serviceDiscovery": {
                    "awsCloudMap": {
                        "attributes": [
                            {
                                "key": "Environment",
                                "value": "Testing"
                            }
                        ],
                        "namespaceName": "namespace1",
                        "serviceName": "serviceA"
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualNodeName": "vnServiceA"
        }
    }

For more information, see `Virtual Nodes <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html>`__ in the *AWS App Mesh User Guide*.
