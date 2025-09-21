**Describe an identity provider configuration associated to your Amazon EKS Cluster**

The following ``describe-identity-provider-config`` example describes an identity provider configuration associated to your Amazon EKS Cluster. ::

    aws eks describe-identity-provider-config \
        --cluster-name my-eks-cluster \
        --identity-provider-config type=oidc,name=my-identity-provider

Output::

    {
        "identityProviderConfig": {
            "oidc": {
                "identityProviderConfigName": "my-identity-provider",
                "identityProviderConfigArn": "arn:aws:eks:us-east-2:111122223333:identityproviderconfig/my-eks-cluster/oidc/my-identity-provider/8ac76722-78e4-cec1-ed76-d49eea058622",
                "clusterName": "my-eks-cluster",
                "issuerUrl": "https://oidc.eks.us-east-2.amazonaws.com/id/38D6A4619A0A69E342B113ED7F1A7652",
                "clientId": "kubernetes",
                "usernameClaim": "email",
                "usernamePrefix": "my-username-prefix",
                "groupsClaim": "my-claim",
                "groupsPrefix": "my-groups-prefix",
                "requiredClaims": {
                    "Claim1": "value1",
                    "Claim2": "value2"
                },
                "tags": {
                    "env": "dev"
                },
                "status": "ACTIVE"
            }
        }
    }

For more information, see `Authenticate users for your cluster from an OpenID Connect identity provider <https://docs.aws.amazon.com/eks/latest/userguide/authenticate-oidc-identity-provider.html>`__ in the *Amazon EKS User Guide*.
