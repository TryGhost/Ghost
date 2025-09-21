**List all the installed add-ons in your Amazon EKS cluster named `my-eks-cluster`**

The following ``list-addons`` example lists all the installed add-ons in your Amazon EKS cluster named `my-eks-cluster`. ::

    aws eks list-addons \
        --cluster-name my-eks-cluster

Output::

    {
        "addons": [
            "kube-proxy",
            "vpc-cni"
        ]
    }
