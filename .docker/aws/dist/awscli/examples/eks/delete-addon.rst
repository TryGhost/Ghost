**Example 1. To deletes an Amazon EKS add-on but preserve the add-on software on the EKS Cluster**

The following ``delete-addon`` example command deletes an Amazon EKS add-on but preserve the add-on software on the EKS Cluster. ::

    aws eks delete-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --preserve

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "DELETING",
            "addonVersion": "v1.9.3-eksbuild.7",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/a8c71ed3-944e-898b-9167-c763856af4b8",
            "createdAt": "2024-03-14T11:49:09.009000-04:00",
            "modifiedAt": "2024-03-14T12:03:49.776000-04:00",
            "tags": {}
        }
    }

For more information, see `Managing Amazon EKS add-ons - Deleting an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#removing-an-add-on>`__ in the *Amazon EKS*.

**Example 2. To deletes an Amazon EKS add-on and also delete the add-on software from the EKS Cluster**

The following ``delete-addon`` example command deletes an Amazon EKS add-on and also delete the add-on software from the EKS Cluster. ::

    aws eks delete-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "DELETING",
            "addonVersion": "v1.15.1-eksbuild.1",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/bac71ed1-ec43-3bb6-88ea-f243cdb58954",
            "createdAt": "2024-03-14T11:45:31.983000-04:00",
            "modifiedAt": "2024-03-14T11:58:40.136000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {}
        }
    }

For more information, see `Managing Amazon EKS add-ons - Deleting an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#removing-an-add-on>`__ in the *Amazon EKS*.
