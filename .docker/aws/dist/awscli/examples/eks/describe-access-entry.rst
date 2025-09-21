**To describe the access entry for EKS cluster**

The following ``describe-access-entry`` example describes an access entry for the EKS cluster. ::

    aws eks describe-access-entry \
        --cluster-name eks-customer \
        --principal-arn arn:aws:iam::111122223333:user/eks-admin-user

Output::

    {
        "accessEntry": {
            "clusterName": "eks-customer",
            "principalArn": "arn:aws:iam::111122223333:user/eks-admin-user",
            "kubernetesGroups": [],
            "accessEntryArn": "arn:aws:eks:us-west-2:111122223333:access-entry/eks-customer/user/111122223333/eks-admin-user/0acb1bc6-cb0a-ede6-11ae-a6506e3d36p0",
            "createdAt": "2025-04-14T22:45:48.097000-05:00",
            "modifiedAt": "2025-04-14T22:45:48.097000-05:00",
            "tags": {},
            "username": "arn:aws:iam::111122223333:user/eks-admin-user",
            "type": "STANDARD"
        }
    }

For more information, see `Grant IAM users access to Kubernetes with EKS access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html>`__ in the *Amazon EKS User Guide*.