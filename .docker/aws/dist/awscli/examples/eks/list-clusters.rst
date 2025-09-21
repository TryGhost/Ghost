**To list all the installed add-ons in your Amazon EKS cluster named `my-eks-cluster`**

The following ``list-clusters`` example lists all the installed add-ons in your Amazon EKS cluster named `my-eks-cluster`. ::

    aws eks list-clusters

Output::

    {
        "clusters": [
            "prod",
            "qa",
            "stage",
            "my-eks-cluster"
        ]
    }
