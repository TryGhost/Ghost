**Example 1: Register an external EKS_ANYWHERE Kubernetes cluster to Amazon EKS**

The following ``register-cluster`` example registers an external EKS_ANYWHERE Kubernetes cluster to Amazon EKS. ::

    aws eks register-cluster \
        --name my-eks-anywhere-cluster \
        --connector-config 'roleArn=arn:aws:iam::111122223333:role/AmazonEKSConnectorAgentRole,provider=EKS_ANYWHERE'

Output::

    {
        "cluster": {
            "name": "my-eks-anywhere-cluster",
            "arn": "arn:aws:eks:us-east-2:111122223333:cluster/my-eks-anywhere-cluster",
            "createdAt": "2024-04-12T12:38:37.561000-04:00",
            "status": "PENDING",
            "tags": {},
            "connectorConfig": {
                "activationId": "xxxxxxxxACTIVATION_IDxxxxxxxx",
                "activationCode": "xxxxxxxxACTIVATION_CODExxxxxxxx",
                "activationExpiry": "2024-04-15T12:38:37.082000-04:00",
                "provider": "EKS_ANYWHERE",
                "roleArn": "arn:aws:iam::111122223333:role/AmazonEKSConnectorAgentRole"
            }
        }
    }

For more information, see `Connecting an external cluster <https://docs.aws.amazon.com/eks/latest/userguide/connecting-cluster.html>`__ in the *Amazon EKS User Guide*.

**Example 2: Register any external Kubernetes cluster to Amazon EKS**

The following ``register-cluster`` example registers an external EKS_ANYWHERE Kubernetes cluster to Amazon EKS. ::

    aws eks register-cluster \
        --name my-eks-anywhere-cluster \
        --connector-config 'roleArn=arn:aws:iam::111122223333:role/AmazonEKSConnectorAgentRole,provider=OTHER'

Output::

    {
        "cluster": {
            "name": "my-onprem-k8s-cluster",
            "arn": "arn:aws:eks:us-east-2:111122223333:cluster/my-onprem-k8s-cluster",
            "createdAt": "2024-04-12T12:42:10.861000-04:00",
            "status": "PENDING",
            "tags": {},
            "connectorConfig": {
                "activationId": "xxxxxxxxACTIVATION_IDxxxxxxxx",
                "activationCode": "xxxxxxxxACTIVATION_CODExxxxxxxx",
                "activationExpiry": "2024-04-15T12:42:10.339000-04:00",
                "provider": "OTHER",
                "roleArn": "arn:aws:iam::111122223333:role/AmazonEKSConnectorAgentRole"
            }
        }
    }

For more information, see `Connecting an external cluster <https://docs.aws.amazon.com/eks/latest/userguide/connecting-cluster.html>`__ in the *Amazon EKS User Guide*.
