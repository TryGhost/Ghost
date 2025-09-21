**To delete the EKS Pod Identity association**

The following ``delete-pod-identity-association`` example deletes the EKS Pod Identity association with association ID ``a-9njjin9gfghecgocd`` from the EKS cluster named ``eks-customer``. ::

    aws eks delete-pod-identity-association \
        --cluster-name eks-customer \
        --association-id a-9njjin9gfghecgocd

Output::

    {
        "association": {
            "clusterName": "eks-customer",
            "namespace": "default",
            "serviceAccount": "default",
            "roleArn": "arn:aws:iam::111122223333:role/s3-role",
            "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-9njjin9gfghecgocd",
            "associationId": "a-9njjin9gfghecgocd",
            "tags": {
                "Key2": "value2",
                "Key1": "value1"
            },
            "createdAt": "2025-05-24T19:52:14.135000-05:00",
            "modifiedAt": "2025-05-25T21:10:56.923000-05:00"
        }
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.