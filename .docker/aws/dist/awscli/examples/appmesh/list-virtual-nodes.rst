**To list virtual nodes**

The following ``list-virtual-nodes`` example lists all of the virtual nodes in the specified service mesh. ::

    aws appmesh list-virtual-nodes \
        --mesh-name app1

Output::

    {
        "virtualNodes": [
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceBv1",
                "meshName": "app1",
                "virtualNodeName": "vnServiceBv1"
            },
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualNode/vnServiceBv2",
                "meshName": "app1",
                "virtualNodeName": "vnServiceBv2"
            }
        ]
    }

For more information, see `Virtual Nodes <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html>`__ in the *AWS App Mesh User Guide*.
