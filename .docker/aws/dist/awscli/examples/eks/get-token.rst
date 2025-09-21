**Example 1: Get an authentication token for an Amazon EKS Cluster named `my-eks-cluster`**

The following ``get-token`` example gets an authentication token for an Amazon EKS Cluster named `my-eks-cluster`. ::

    aws eks get-token \
        --cluster-name my-eks-cluster

Output::

    {
        "kind": "ExecCredential",
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "spec": {},
        "status": {
            "expirationTimestamp": "2024-04-11T20:59:56Z",
            "token": "k8s-aws-v1.EXAMPLE_TOKEN_DATA_STRING..."
        }
    }

**Example 2: Gets an authentication token for an Amazon EKS Cluster named `my-eks-cluster` by assuming this roleARN for credentials when signing the token**

The following ``get-token`` example gets an authentication token for an Amazon EKS Cluster named `my-eks-cluster` by assuming this roleARN for credentials when signing the token. ::

    aws eks get-token \
        --cluster-name my-eks-cluster \
        --role-arn arn:aws:iam::111122223333:role/eksctl-EKS-Linux-Cluster-v1-24-cluster-ServiceRole-j1k7AfTIQtnM

Output::

    {
        "kind": "ExecCredential",
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "spec": {},
        "status": {
            "expirationTimestamp": "2024-04-11T21:05:26Z",
            "token": "k8s-aws-v1.EXAMPLE_TOKEN_DATA_STRING..."
        }
    }
