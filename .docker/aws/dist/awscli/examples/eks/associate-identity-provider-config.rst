**Associate identity provider to your Amazon EKS Cluster**

The following ``associate-identity-provider-config`` example associates an identity provider to your Amazon EKS Cluster. ::

    aws eks associate-identity-provider-config \
        --cluster-name my-eks-cluster \
        --oidc 'identityProviderConfigName=my-identity-provider,issuerUrl=https://oidc.eks.us-east-2.amazonaws.com/id/38D6A4619A0A69E342B113ED7F1A7652,clientId=kubernetes,usernameClaim=email,usernamePrefix=my-username-prefix,groupsClaim=my-claim,groupsPrefix=my-groups-prefix,requiredClaims={Claim1=value1,Claim2=value2}' \
        --tags env=dev

Output::

    {
        "update": {
            "id": "8c6c1bef-61fe-42ac-a242-89412387b8e7",
            "status": "InProgress",
            "type": "AssociateIdentityProviderConfig",
            "params": [
                {
                    "type": "IdentityProviderConfig",
                    "value": "[{\"type\":\"oidc\",\"name\":\"my-identity-provider\"}]"
                }
            ],
            "createdAt": "2024-04-11T13:46:49.648000-04:00",
            "errors": []
        },
        "tags": {
            "env": "dev"
        }
    }

For more information, see `Authenticate users for your cluster from an OpenID Connect identity provider - Associate an OIDC identity provider <https://docs.aws.amazon.com/eks/latest/userguide/authenticate-oidc-identity-provider.html#associate-oidc-identity-provider>`__ in the *Amazon EKS User Guide*.
