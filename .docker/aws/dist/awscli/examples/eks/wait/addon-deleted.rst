**To wait for an add-on running in the Amazon EKS cluster to be deleted**

The following ``wait addon-deleted`` example command waits until ``ResourceNotFoundException`` is thrown when polling with `describe-addon` for an add-on named ``aws-efs-csi-driver`` running in the Amazon EKS cluster named ``my-eks-cluster``. ::

    aws eks wait addon-deleted \
        --cluster-name my-eks-cluster \
        --addon-name aws-efs-csi-driver

This command produces no output.