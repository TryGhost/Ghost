**To list all available access policies**

This ``list-access-policies`` example returns the list of all available access policies. ::

    aws eks list-access-policies

Output::

    {
        "accessPolicies": [
            {
                "name": "AmazonEKSAdminPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy"
            },
            {
                "name": "AmazonEKSAdminViewPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminViewPolicy"
            },
            {
                "name": "AmazonEKSAutoNodePolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAutoNodePolicy"
            },
            {
                "name": "AmazonEKSBlockStorageClusterPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSBlockStorageClusterPolicy"
            },
            {
                "name": "AmazonEKSBlockStoragePolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSBlockStoragePolicy"
            },
            {
                "name": "AmazonEKSClusterAdminPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
            },
            {
                "name": "AmazonEKSComputeClusterPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSComputeClusterPolicy"
            },
            {
                "name": "AmazonEKSComputePolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSComputePolicy"
            },
            {
                "name": "AmazonEKSEditPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
            },
            {
                "name": "AmazonEKSHybridPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSHybridPolicy"
            },
            {
                "name": "AmazonEKSLoadBalancingClusterPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSLoadBalancingClusterPolicy"
            },
            {
                "name": "AmazonEKSLoadBalancingPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSLoadBalancingPolicy"
            },
            {
                "name": "AmazonEKSNetworkingClusterPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSNetworkingClusterPolicy"
            },
            {
                "name": "AmazonEKSNetworkingPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSNetworkingPolicy"
            },
            {
                "name": "AmazonEKSViewPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy"
            },
            {
                "name": "AmazonEMRJobPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonEMRJobPolicy"
            },
            {
                "name": "AmazonSagemakerHyperpodClusterPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonSagemakerHyperpodClusterPolicy"
            },
            {
                "name": "AmazonSagemakerHyperpodControllerPolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonSagemakerHyperpodControllerPolicy"
            },
            {
                "name": "AmazonSagemakerHyperpodSystemNamespacePolicy",
                "arn": "arn:aws:eks::aws:cluster-access-policy/AmazonSagemakerHyperpodSystemNamespacePolicy"
            }
        ]
    }

For more information, see `Associate access policies with access entries <https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html>`__ in the *Amazon EKS User Guide*.