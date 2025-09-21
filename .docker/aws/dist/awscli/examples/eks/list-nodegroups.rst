**List all the node groups in an Amazon EKS cluster**

The following ``list-nodegroups`` example list all the node groups in an Amazon EKS cluster. ::

    aws eks list-nodegroups \
        --cluster-name my-eks-cluster

Output::

    {
        "nodegroups": [
            "my-eks-managed-node-group",
            "my-eks-nodegroup"
        ]
    }
