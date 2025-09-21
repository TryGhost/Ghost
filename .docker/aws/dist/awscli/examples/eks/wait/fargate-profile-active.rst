**To wait for an fargate-profile running in the Amazon EKS cluster to become ACTIVE**

The following ``wait fargate-profile-active`` example command waits for an fargate-profile named ``my-fargate-profile`` running in the Amazon EKS cluster named ``my-eks-cluster`` to be ``ACTIVE``. ::

    aws eks wait fargate-profile-active \
        --cluster-name my-eks-cluster \
        --fargate-profile-name my-fargate-profile

This command produces no output.