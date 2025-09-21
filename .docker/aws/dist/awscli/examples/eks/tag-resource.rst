**Example 1: To add the specified tags to an Amazon EKS Cluster**

The following ``tag-resource`` example adds the specified tags to an Amazon EKS Cluster. ::

    aws eks tag-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster \
        --tag 'my-eks-cluster-test-1=test-value-1,my-eks-cluster-dev-1=dev-value-2'

This command produces no output.

**Example 2: To add the specified tags to an Amazon EKS Node group**

The following ``tag-resource`` example adds the specified tags to an Amazon EKS Node group. ::

    aws eks tag-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:nodegroup/my-eks-cluster/my-eks-managed-node-group/60c71ed2-2cfb-020f-a5f4-ad32477f198c \
        --tag 'my-eks-nodegroup-test-1=test-value-1,my-eks-nodegroup-dev-1=dev-value-2'

This command produces no output.