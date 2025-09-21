**To deregisters a connected cluster to remove it from the Amazon EKS control plane**

The following ``deregister-cluster`` example deregisters a connected cluster to remove it from the Amazon EKS control plane. ::

    aws eks deregister-cluster \
        --name my-eks-anywhere-cluster

Output::

    {
        "cluster": {
            "name": "my-eks-anywhere-cluster",
            "arn": "arn:aws:eks:us-east-2:111122223333:cluster/my-eks-anywhere-cluster",
            "createdAt": "2024-04-12T12:38:37.561000-04:00",
            "status": "DELETING",
            "tags": {},
            "connectorConfig": {
                "activationId": "dfb5ad28-13c3-4e26-8a19-5b2457638c74",
                "activationExpiry": "2024-04-15T12:38:37.082000-04:00",
                "provider": "EKS_ANYWHERE",
                "roleArn": "arn:aws:iam::111122223333:role/AmazonEKSConnectorAgentRole"
            }
        }
    }

For more information, see `Deregistering a cluster <https://docs.aws.amazon.com/eks/latest/userguide/deregister-connected-cluster.html>`__ in the *Amazon EKS User Guide*.
