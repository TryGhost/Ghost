**To wait for an Amazon EKS cluster to become ACTIVE**

The following ``wait cluster-active`` example command waits for an Amazon EKS cluster named ``my-eks-cluster`` status to become ``ACTIVE``. ::

    aws eks wait cluster-active \
        --name my-eks-cluster

This command produces no output.