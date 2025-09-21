**To list the access entries for an EKS cluster**

The following ``list-access-entries`` returns the list of access entries associated with the EKS cluster ``eks-customer``. ::

    aws eks list-access-entries \
        --cluster-name eks-customer

Output::

    {
        "accessEntries": [
            "arn:aws:iam::111122223333:role/Admin",
            "arn:aws:iam::111122223333:role/admin-test-ip",
            "arn:aws:iam::111122223333:role/assume-worker-node-role",
            "arn:aws:iam::111122223333:user/eks-admin-user"
        ]
    }

For more information, see `Grant IAM users access to Kubernetes with EKS access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html>`__ in the *Amazon EKS User Guide*.