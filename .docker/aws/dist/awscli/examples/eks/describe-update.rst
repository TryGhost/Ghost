**Example 1: To describe an update for a cluster**

The following ``describe-update`` example describes an update for a cluster named. ::

    aws eks describe-update \
        --name my-eks-cluster \
        --update-id 10bddb13-a71b-425a-b0a6-71cd03e59161

Output::

    {
        "update": {
            "id": "10bddb13-a71b-425a-b0a6-71cd03e59161",
            "status": "Successful",
            "type": "EndpointAccessUpdate",
            "params": [
                {
                    "type": "EndpointPublicAccess",
                    "value": "false"
                },
                {
                    "type": "EndpointPrivateAccess",
                    "value": "true"
                }
            ],
            "createdAt": "2024-03-14T10:01:26.297000-04:00",
            "errors": []
        }
    }

For more information, see `Updating an Amazon EKS cluster Kubernetes version <https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html>`__ in the *Amazon EKS User Guide*.

**Example 2: To describe an update for a cluster**

The following ``describe-update`` example describes an update for a cluster named. ::

    aws eks describe-update \
        --name my-eks-cluster \
        --update-id e4994991-4c0f-475a-a040-427e6da52966

Output::

    {
        "update": {
            "id": "e4994991-4c0f-475a-a040-427e6da52966",
            "status": "Successful",
            "type": "AssociateEncryptionConfig",
            "params": [
                {
                    "type": "EncryptionConfig",
                    "value": "[{\"resources\":[\"secrets\"],\"provider\":{\"keyArn\":\"arn:aws:kms:region-code:account:key/key\"}}]"
                }
            ],
            "createdAt": "2024-03-14T11:01:26.297000-04:00",
            "errors": []
        }
    }

For more information, see `Updating an Amazon EKS cluster Kubernetes version <https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html>`__ in the *Amazon EKS User Guide*.

**Example 3: To describe an update for a cluster**

The following ``describe-update`` example describes an update for a cluster named. ::

    aws eks describe-update \
        --name my-eks-cluster \
        --update-id b5f0ba18-9a87-4450-b5a0-825e6e84496f

Output::

    {
        "update": {
            "id": "b5f0ba18-9a87-4450-b5a0-825e6e84496f",
            "status": "Successful",
            "type": "VersionUpdate",
            "params": [
                {
                    "type": "Version",
                    "value": "1.29"
                },
                {
                    "type": "PlatformVersion",
                    "value": "eks.1"
                }
            ],
            "createdAt": "2024-03-14T12:05:26.297000-04:00",
            "errors": []
        }
    }

For more information, see `Updating an Amazon EKS cluster Kubernetes version <https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html>`__ in the *Amazon EKS User Guide*.
