**To wait until Amazon EKS cluster is deleted**

The following ``wait cluster-deleted`` example command waits until ``ResourceNotFoundException`` is thrown when polling with ``describe-cluster`` for Amazon EKS cluster named ``my-eks-cluster``. ::

    aws eks wait cluster-deleted \
        --name my-eks-cluster

This command produces no output.