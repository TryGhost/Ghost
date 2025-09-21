**Example 1: To create an EKS Pod Identity association in EKS cluster**

The following ``create-pod-identity-association`` example creates an EKS Pod Identity association between a service account in the EKS cluster and an IAM role. ::

    aws eks create-pod-identity-association \
        --cluster-name eks-customer \
        --namespace default \
        --service-account default \
        --role-arn arn:aws:iam::111122223333:role/my-role

Output::

    {
        "association": {
            "clusterName": "eks-customer",
            "namespace": "default",
            "serviceAccount": "default",
            "roleArn": "arn:aws:iam::111122223333:role/my-role",
            "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-8mvwvh57cu74mgcst",
            "associationId": "a-8mvwvh57cu74mgcst",
            "tags": {},
            "createdAt": "2025-05-24T19:40:13.961000-05:00",
            "modifiedAt": "2025-05-24T19:40:13.961000-05:00"
        }
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.

**Example 2: To create an EKS Pod Identity association in EKS cluster with tags**

The following ``create-pod-identity-association`` creates an EKS Pod Identity association between a service account and an IAM role in the EKS cluster with tags. ::

    aws eks create-pod-identity-association \
        --cluster-name eks-customer \
        --namespace default \
        --service-account default \
        --role-arn arn:aws:iam::111122223333:role/my-role \
        --tags Key1=value1,Key2=value2

Output::

    {
        "association": {
            "clusterName": "eks-customer",
            "namespace": "default",
            "serviceAccount": "default",
            "roleArn": "arn:aws:iam::111122223333:role/my-role",
            "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-9njjin9gfghecgoda",
            "associationId": "a-9njjin9gfghecgoda",
            "tags": {
                "Key2": "value2",
                "Key1": "value1"
            },
            "createdAt": "2025-05-24T19:52:14.135000-05:00",
            "modifiedAt": "2025-05-24T19:52:14.135000-05:00"
        }
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.