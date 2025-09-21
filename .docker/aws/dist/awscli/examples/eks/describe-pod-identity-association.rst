**To provide the details about Pod Identity association**

The following ``describe-pod-identity-association`` example describes a Pod Identity association in the EKS cluster. ::

    aws eks describe-pod-identity-association \
        --cluster-name eks-customer \
        --association-id a-9njjin9gfghecgocd

Output::

    {
        "association": {
            "clusterName": "eks-customer",
            "namespace": "default",
            "serviceAccount": "default",
            "roleArn": "arn:aws:iam::111122223333:role/my-role",
            "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-9njjin9gfghecgocd",
            "associationId": "a-9njjin9gfghecgocd",
            "tags": {
                "Key2": "value2",
                "Key1": "value1"
            },
            "createdAt": "2025-05-24T19:52:14.135000-05:00",
            "modifiedAt": "2025-05-24T19:52:14.135000-05:00"
        }
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.