**Describe actively running EKS addon in your Amazon EKS cluster**

The following ``describe-cluster`` example actively running EKS addon in your Amazon EKS cluster. ::

    aws eks describe-cluster \
        --name my-eks-cluster

Output::

    {
        "cluster": {
            "name": "my-eks-cluster",
            "arn": "arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster",
            "createdAt": "2024-03-14T11:31:44.348000-04:00",
            "version": "1.26",
            "endpoint": "https://JSA79429HJDASKJDJ8223829MNDNASW.yl4.us-east-2.eks.amazonaws.com",
            "roleArn": "arn:aws:iam::111122223333:role/eksctl-my-eks-cluster-cluster-ServiceRole-zMF6CBakwwbW",
            "resourcesVpcConfig": {
                "subnetIds": [
                    "subnet-0fb75d2d8401716e7",
                    "subnet-02184492f67a3d0f9",
                    "subnet-04098063527aab776",
                    "subnet-0e2907431c9988b72",
                    "subnet-04ad87f71c6e5ab4d",
                    "subnet-09d912bb63ef21b9a"
                ],
                "securityGroupIds": [
                    "sg-0c1327f6270afbb36"
                ],
                "clusterSecurityGroupId": "sg-01c84d09d70f39a7f",
                "vpcId": "vpc-0012b8e1cc0abb17d",
                "endpointPublicAccess": true,
                "endpointPrivateAccess": true,
                "publicAccessCidrs": [
                    "22.19.18.2/32"
                ]
            },
            "kubernetesNetworkConfig": {
                "serviceIpv4Cidr": "10.100.0.0/16",
                "ipFamily": "ipv4"
            },
            "logging": {
                "clusterLogging": [
                    {
                        "types": [
                            "api",
                            "audit",
                            "authenticator",
                            "controllerManager",
                            "scheduler"
                        ],
                        "enabled": true
                    }
                ]
            },
            "identity": {
                "oidc": {
                    "issuer": "https://oidc.eks.us-east-2.amazonaws.com/id/JSA79429HJDASKJDJ8223829MNDNASW"
                }
            },
            "status": "ACTIVE",
            "certificateAuthority": {
                "data": "CA_DATA_STRING..."
            },
            "platformVersion": "eks.14",
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
            },
            "health": {
                "issues": []
            },
            "accessConfig": {
                "authenticationMode": "API_AND_CONFIG_MAP"
            }
        }
    }
