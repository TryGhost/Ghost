**Describe actively running EKS addon in your Amazon EKS cluster**

The following ``describe-addon`` example actively running EKS addon in your Amazon EKS cluster. ::

    aws eks describe-addon \
        --cluster-name my-eks-cluster \
        --addon-name vpc-cni

Output::

    {
        "addon": {
            "addonName": "vpc-cni",
            "clusterName": "my-eks-cluster",
            "status": "ACTIVE",
            "addonVersion": "v1.16.4-eksbuild.2",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/vpc-cni/0ec71efc-98dd-3203-60b0-4b939b2a5e5f",
            "createdAt": "2024-03-14T13:18:45.417000-04:00",
            "modifiedAt": "2024-03-14T13:18:49.557000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/eksctl-my-eks-cluster-addon-vpc-cni-Role1-YfakrqOC1UTm",
            "tags": {
                "eks-addon-key-3": "value-3",
                "eks-addon-key-4": "value-4"
            },
            "configurationValues": "resources:\n    limits:\n        cpu: '100m'\nenv:\n    AWS_VPC_K8S_CNI_LOGLEVEL: 'DEBUG'"
        }
    }
