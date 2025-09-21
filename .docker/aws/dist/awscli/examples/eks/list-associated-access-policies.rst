**To list the access policies associated with an access entry**

The following ``list-associated-access-policies`` example returns the list of access policies associated with an access entry in the EKS cluster. ::

    aws eks list-associated-access-policies \
        --cluster-name eks-customer \
        --principal-arn arn:aws:iam::111122223333:role/Admin

Output::

    {
        "associatedAccessPolicies": [
            {
                "policyArn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy",
                "accessScope": {
                    "type": "cluster",
                    "namespaces": []
                },
                "associatedAt": "2025-05-24T17:26:22.935000-05:00",
                "modifiedAt": "2025-05-24T17:26:22.935000-05:00"
            }
        ],
        "clusterName": "eks-customer",
        "principalArn": "arn:aws:iam::111122223333:role/Admin"
    }

For more information, see `Grant IAM users access to Kubernetes with EKS access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html>`__ in the *Amazon EKS User Guide*.