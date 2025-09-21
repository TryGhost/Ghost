**Example 8: To wait for an nodegroup running in the Amazon EKS cluster to become ACTIVE**

The following ``wait nodegroup-active`` example command waits for an nodegroup named ``my-nodegroup`` running in the Amazon EKS cluster named ``my-eks-cluster`` to be Active. ::

    aws eks wait nodegroup-active \
        --cluster-name my-eks-cluster \
        --nodegroup-name my-nodegroup

This command produces no output.
