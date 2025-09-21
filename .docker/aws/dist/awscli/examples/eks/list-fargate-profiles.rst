**To list all the fargate profiles in your Amazon EKS cluster named `my-eks-cluster`**

The following ``list-fargate-profiles`` example lists all the fargate profiles in your Amazon EKS cluster named `my-eks-cluster`. ::

    aws eks list-fargate-profiles \
        --cluster-name my-eks-cluster

Output::

    {
        "fargateProfileNames": [
            "my-fargate-profile"
        ]
    }
