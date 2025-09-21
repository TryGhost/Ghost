**Example 1: To deletes the specified tags from an Amazon EKS Cluster**

The following ``untag-resource`` example deletes the specified tags from an Amazon EKS Cluster. ::

    aws eks untag-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster \
        --tag-keys "my-eks-cluster-test-1" "my-eks-cluster-dev-1"

This command produces no output.

**Example 2: To deletes the specified tags from an Amazon EKS Node group**

The following ``untag-resource`` example deletes the specified tags from an Amazon EKS Node group. ::

    aws eks untag-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:nodegroup/my-eks-cluster/my-eks-managed-node-group/60c71ed2-2cfb-020f-a5f4-ad32477f198c \
        --tag-keys "my-eks-nodegroup-test-1" "my-eks-nodegroup-dev-1"

This command produces no output.