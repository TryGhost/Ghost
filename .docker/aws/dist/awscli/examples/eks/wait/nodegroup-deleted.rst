**To wait for an nodegroup running in the Amazon EKS cluster to become deleted**

The following ``wait nodegroup-deleted`` example command waits until ``ResourceNotFoundException`` is thrown when polling with `describe-nodegroup` for an nodegroup named ``my-nodegroup`` running in the Amazon EKS cluster named ``my-eks-cluster``. ::

    aws eks wait nodegroup-deleted \
        --cluster-name my-eks-cluster \
        --nodegroup-name my-nodegroup

This command produces no output.
