**To associate an access policy and its scope to the access entry of the cluster**

The following ``associate-access-policy`` associates an access policy and its scope to the access entry of the specified cluster. ::

    aws eks associate-access-policy \
        --cluster-name eks-customer \
        --principal-arn arn:aws:iam::111122223333:role/Admin \
        --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy \
        --access-scope type=namespace,namespaces=default

Output::

    {
        "clusterName": "eks-customer",
        "principalArn": "arn:aws:iam::111122223333:role/Admin",
        "associatedAccessPolicy": {
            "policyArn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy",
            "accessScope": {
                "type": "namespace",
                "namespaces": [
                    "default"
                ]
            },
            "associatedAt": "2025-05-24T15:59:51.981000-05:00",
            "modifiedAt": "2025-05-24T15:59:51.981000-05:00"
        }
    }

For more information, see `Associate access policies with access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html>`__ in the *Amazon EKS User Guide*.