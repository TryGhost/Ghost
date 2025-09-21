**To delete an access entry associated with the cluster**

The following ``delete-access-entry`` deletes an access entry associated with the EKS cluster named ``eks-customer``. ::

    aws eks delete-access-entry \
        --cluster-name eks-customer \
        --principal-arn arn:aws:iam::111122223333:role/Admin

This command produces no output.

For more information, see `Delete access entries <https://docs.aws.amazon.com/eks/latest/userguide/deleting-access-entries.html>`__ in the *Amazon EKS User Guide*.