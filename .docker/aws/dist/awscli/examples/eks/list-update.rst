**Example 1: To lists the updates associated with an Amazon EKS Cluster name**

The following ``list-updates`` example lists all the update IDs for an Amazon EKS Cluster name. ::

    aws eks list-updates \
        --name my-eks-cluster

Output::

    {
        "updateIds": [
            "5f78d14e-c57b-4857-a3e4-cf664ae20949",
            "760e5a3f-adad-48c7-88d3-7ac283c09c26",
            "cd4ec863-bc55-47d5-a377-3971502f529b",
            "f12657ce-e869-4f17-b158-a82ab8b7d937"
        ]
    }

**Example 2: To list all the update IDs for an Amazon EKS Node group**

The following ``list-updates`` example lists all the update IDs for an Amazon EKS Node group. ::

    aws eks list-updates \
        --name my-eks-cluster \
        --nodegroup-name my-eks-managed-node-group

Output::

    {
        "updateIds": [
            "8c6c1bef-61fe-42ac-a242-89412387b8e7"
        ]
    }

**Example 3: To list all the update IDs on an Amazon EKS Add-one**

The following ``list-updates`` example lists all the update IDs for an Amazon EKS Add-on. ::

    aws eks list-updates \
        --name my-eks-cluster \
        --addon-name vpc-cni

Output::

    {
        "updateIds": [
            "9cdba8d4-79fb-3c83-afe8-00b508d33268"
        ]
    }
