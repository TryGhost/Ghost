**Example 1: Create EKS Fargate Profile for a selector with a namespace**

The following ``delete-fargate-profile`` example creates an EKS Fargate Profile for a selector with a namespace. ::

    aws eks delete-fargate-profile \
        --cluster-name my-eks-cluster \
        --fargate-profile-name my-fargate-profile

Output::

    {
        "fargateProfile": {
            "fargateProfileName": "my-fargate-profile",
            "fargateProfileArn": "arn:aws:eks:us-east-2:111122223333:fargateprofile/my-eks-cluster/my-fargate-profile/1ac72bb3-3fc6-2631-f1e1-98bff53bed62",
            "clusterName": "my-eks-cluster",
            "createdAt": "2024-03-19T11:48:39.975000-04:00",
            "podExecutionRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "subnets": [
                "subnet-09d912bb63ef21b9a",
                "subnet-04ad87f71c6e5ab4d",
                "subnet-0e2907431c9988b72"
            ],
            "selectors": [
                {
                    "namespace": "default",
                    "labels": {
                        "foo": "bar"
                    }
                }
            ],
            "status": "DELETING",
            "tags": {}
        }
    }

For more information, see `AWS Fargate profile - Deleting a Fargate <https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html#delete-fargate-profile>`__ in the *Amazon EKS User Guide*.
