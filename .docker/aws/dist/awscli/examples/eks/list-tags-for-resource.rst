**Example 1: To list all the tags for an Amazon EKS Cluster ARN**

The following ``list-tags-for-resource`` example lists all the tags for an Amazon EKS Cluster ARN. ::

    aws eks list-tags-for-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster

Output::

    {
        "tags": {
            "aws:cloudformation:stack-name": "eksctl-my-eks-cluster-cluster",
            "alpha.eksctl.io/cluster-name": "my-eks-cluster",
            "karpenter.sh/discovery": "my-eks-cluster",
            "aws:cloudformation:stack-id": "arn:aws:cloudformation:us-east-2:111122223333:stack/eksctl-my-eks-cluster-cluster/e752ea00-e217-11ee-beae-0a9599c8c7ed",
            "auto-delete": "no",
            "eksctl.cluster.k8s.io/v1alpha1/cluster-name": "my-eks-cluster",
            "EKS-Cluster-Name": "my-eks-cluster",
            "alpha.eksctl.io/cluster-oidc-enabled": "true",
            "aws:cloudformation:logical-id": "ControlPlane",
            "alpha.eksctl.io/eksctl-version": "0.173.0-dev+a7ee89342.2024-03-01T03:40:57Z",
            "Name": "eksctl-my-eks-cluster-cluster/ControlPlane"
        }
    }

**Example 2: To list all the tags for an Amazon EKS Node group ARN**

The following ``list-tags-for-resource`` example lists all the tags for an Amazon EKS Node group ARN. ::

    aws eks list-tags-for-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:nodegroup/my-eks-cluster/my-eks-managed-node-group/60c71ed2-2cfb-020f-a5f4-ad32477f198c

Output::

    {
        "tags": {
            "aws:cloudformation:stack-name": "eksctl-my-eks-cluster-nodegroup-my-eks-managed-node-group",
            "aws:cloudformation:stack-id": "arn:aws:cloudformation:us-east-2:111122223333:stack/eksctl-my-eks-cluster-nodegroup-my-eks-managed-node-group/eaa20310-e219-11ee-b851-0ab9ad8228ff",
            "eksctl.cluster.k8s.io/v1alpha1/cluster-name": "my-eks-cluster",
            "EKS-Cluster-Name": "my-eks-cluster",
            "alpha.eksctl.io/nodegroup-type": "managed",
            "NodeGroup Name 1": "my-eks-managed-node-group",
            "k8s.io/cluster-autoscaler/enabled": "true",
            "nodegroup-role": "worker",
            "alpha.eksctl.io/cluster-name": "my-eks-cluster",
            "alpha.eksctl.io/nodegroup-name": "my-eks-managed-node-group",
            "karpenter.sh/discovery": "my-eks-cluster",
            "NodeGroup Name 2": "AmazonLinux-Linux-Managed-NG-v1-26-v1",
            "auto-delete": "no",
            "k8s.io/cluster-autoscaler/my-eks-cluster": "owned",
            "aws:cloudformation:logical-id": "ManagedNodeGroup",
            "alpha.eksctl.io/eksctl-version": "0.173.0-dev+a7ee89342.2024-03-01T03:40:57Z"
        }
    }

**Example 3: To list all the tags on an Amazon EKS Fargate profil ARNe**

The following ``list-tags-for-resource`` example lists all the tags for an Amazon EKS Fargate profile ARN. ::

    aws eks list-tags-for-resource  \
        --resource-arn arn:aws:eks:us-east-2:111122223333:fargateprofile/my-eks-cluster/my-fargate-profile/d6c76780-e541-0725-c816-36754cab734b

Output::

    {
        "tags": {
            "eks-fargate-profile-key-2": "value-2",
            "eks-fargate-profile-key-1": "value-1"
        }
    }

**Example 4: To list all the tags for an Amazon EKS Add-on ARN**

The following ``list-tags-for-resource`` example lists all the tags for an Amazon EKS Add-on ARN. ::

    aws eks list-tags-for-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:addon/my-eks-cluster/vpc-cni/0ec71efc-98dd-3203-60b0-4b939b2a5e5f

Output::

    {
        "tags": {
            "eks-addon-key-2": "value-2",
            "eks-addon-key-1": "value-1"
        }
    }

**Example 5: To list all the tags for an Amazon EKS OIDC identity provider ARN**

The following ``list-tags-for-resource`` example lists all the tags for an Amazon EKS OIDC identity provider ARN. ::

    aws eks list-tags-for-resource \
        --resource-arn arn:aws:eks:us-east-2:111122223333:identityproviderconfig/my-eks-cluster/oidc/my-identity-provider/8ac76722-78e4-cec1-ed76-d49eea058622

Output::

    {
        "tags": {
            "my-identity-provider": "test"
        }
    }

