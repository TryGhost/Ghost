**Example 1: To create an Amazon EKS add-on with default compatibile version for the respective EKS cluster version**

The following ``create-addon`` example command creates an Amazon EKS add-on with default compatibile version for the respective EKS cluster version. ::

    aws eks create-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --service-account-role-arn arn:aws:iam::111122223333:role/role-name

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "CREATING",
            "addonVersion": "v1.15.1-eksbuild.1",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/1ec71ee1-b9c2-8915-4e17-e8be0a55a149",
            "createdAt": "2024-03-14T12:20:03.264000-04:00",
            "modifiedAt": "2024-03-14T12:20:03.283000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {}
        }
    }

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 2: To create an Amazon EKS add-on with specific add-on version**

The following ``create-addon`` example command creates an Amazon EKS add-on with specific add-on version. ::

    aws eks create-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --service-account-role-arn arn:aws:iam::111122223333:role/role-name \
        --addon-version v1.16.4-eksbuild.2

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "CREATING",
            "addonVersion": "v1.16.4-eksbuild.2",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/34c71ee6-7738-6c8b-c6bd-3921a176b5ff",
            "createdAt": "2024-03-14T12:30:24.507000-04:00",
            "modifiedAt": "2024-03-14T12:30:24.521000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {}
        }
    }

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 3: To create an Amazon EKS add-on with custom configuration values and resolve conflicts details**

The following ``create-addon`` example command creates an Amazon EKS add-on with custom configuration values and resolves conflicts details. ::

    aws eks create-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --service-account-role-arn arn:aws:iam::111122223333:role/role-name \
        --addon-version v1.16.4-eksbuild.2 \
        --configuration-values '{"resources":{"limits":{"cpu":"100m"}}}' \
        --resolve-conflicts OVERWRITE

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "CREATING",
            "addonVersion": "v1.16.4-eksbuild.2",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/a6c71ee9-0304-9237-1be8-25af1b0f1ffb",
            "createdAt": "2024-03-14T12:35:58.313000-04:00",
            "modifiedAt": "2024-03-14T12:35:58.327000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {},
            "configurationValues": "{\"resources\":{\"limits\":{\"cpu\":\"100m\"}}}"
        }
    }

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 4: To create an Amazon EKS add-on with custom JSON configuration values file**

The following ``create-addon`` example command creates an Amazon EKS add-on with custom configuration values and resolve conflicts details. ::

    aws eks create-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --service-account-role-arn arn:aws:iam::111122223333:role/role-name \
        --addon-version v1.16.4-eksbuild.2 \
        --configuration-values 'file://configuration-values.json' \
        --resolve-conflicts OVERWRITE \
        --tags '{"eks-addon-key-1": "value-1" , "eks-addon-key-2": "value-2"}'

Contents of ``configuration-values.json``::

    {
        "resources": {
            "limits": {
                "cpu": "150m"
            }
        },
        "env": {
            "AWS_VPC_K8S_CNI_LOGLEVEL": "ERROR"
        }
    }

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "CREATING",
            "addonVersion": "v1.16.4-eksbuild.2",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/d8c71ef8-fbd8-07d0-fb32-6a7be19ececd",
            "createdAt": "2024-03-14T13:10:51.763000-04:00",
            "modifiedAt": "2024-03-14T13:10:51.777000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {
                "eks-addon-key-1": "value-1",
                "eks-addon-key-2": "value-2"
            },
            "configurationValues": "{\n    \"resources\": {\n        \"limits\": {\n            \"cpu\": \"150m\"\n        }\n    },\n    \"env\": {\n        \"AWS_VPC_K8S_CNI_LOGLEVEL\": \"ERROR\"\n    }\n}"
        }
    }

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 5: To create an Amazon EKS add-on with custom YAML configuration values file**

The following ``create-addon`` example command creates an Amazon EKS add-on with custom configuration values and resolve conflicts details. ::

    aws eks create-addon \
        --cluster-name my-eks-cluster \
        --addon-name my-eks-addon \
        --service-account-role-arn arn:aws:iam::111122223333:role/role-name \
        --addon-version v1.16.4-eksbuild.2 \
        --configuration-values 'file://configuration-values.yaml' \
        --resolve-conflicts OVERWRITE \
        --tags '{"eks-addon-key-1": "value-1" , "eks-addon-key-2": "value-2"}'

Contents of ``configuration-values.yaml``::

    resources:
        limits:
            cpu: '100m'
    env:
        AWS_VPC_K8S_CNI_LOGLEVEL: 'DEBUG'

Output::

    {
        "addon": {
            "addonName": "my-eks-addon",
            "clusterName": "my-eks-cluster",
            "status": "CREATING",
            "addonVersion": "v1.16.4-eksbuild.2",
            "health": {
                "issues": []
            },
            "addonArn": "arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/my-eks-addon/d4c71efb-3909-6f36-a548-402cd4b5d59e",
            "createdAt": "2024-03-14T13:15:45.220000-04:00",
            "modifiedAt": "2024-03-14T13:15:45.237000-04:00",
            "serviceAccountRoleArn": "arn:aws:iam::111122223333:role/role-name",
            "tags": {
                "eks-addon-key-3": "value-3",
                "eks-addon-key-4": "value-4"
            },
            "configurationValues": "resources:\n    limits:\n        cpu: '100m'\nenv:\n    AWS_VPC_K8S_CNI_LOGLEVEL: 'INFO'"
        }
    }

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.
