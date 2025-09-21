**To disassociate the access policy from an access entry**

The following ``disassociate-access-policy`` removes the access policy associated with the access entry. ::

    aws eks disassociate-access-policy \
        --cluster-name eks-customer \
        --principal-arn arn:aws:iam::111122223333:role/Admin \
        --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy

This command produces no output.

For more information, see `Associate access policies with access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html>`__ in the *Amazon EKS User Guide*.