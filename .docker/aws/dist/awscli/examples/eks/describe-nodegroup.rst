**Describe a managed node group for an Amazon EKS cluster**

The following ``describe-nodegroup`` example describes a managed node group for an Amazon EKS cluster. ::

    aws eks describe-nodegroup \
        --cluster-name my-eks-cluster \
        --nodegroup-name my-eks-nodegroup

Output::

    {
        "nodegroup": {
            "nodegroupName": "my-eks-nodegroup",
            "nodegroupArn": "arn:aws:eks:us-east-2:111122223333:nodegroup/my-eks-cluster/my-eks-nodegroup/a8c75f2f-df78-a72f-4063-4b69af3de5b1",
            "clusterName": "my-eks-cluster",
            "version": "1.26",
            "releaseVersion": "1.26.12-20240329",
            "createdAt": "2024-04-08T11:42:10.555000-04:00",
            "modifiedAt": "2024-04-08T11:44:12.402000-04:00",
            "status": "ACTIVE",
            "capacityType": "ON_DEMAND",
            "scalingConfig": {
                "minSize": 1,
                "maxSize": 3,
                "desiredSize": 1
            },
            "instanceTypes": [
                "t3.medium"
            ],
            "subnets": [
                "subnet-0e2907431c9988b72",
                "subnet-04ad87f71c6e5ab4d",
                "subnet-09d912bb63ef21b9a"
            ],
            "amiType": "AL2_x86_64",
            "nodeRole": "arn:aws:iam::111122223333:role/role-name",
            "labels": {},
            "resources": {
                "autoScalingGroups": [
                    {
                        "name": "eks-my-eks-nodegroup-a8c75f2f-df78-a72f-4063-4b69af3de5b1"
                    }
                ]
            },
            "diskSize": 20,
            "health": {
                "issues": []
            },
            "updateConfig": {
                "maxUnavailable": 1
            },
            "tags": {}
        }
    }
