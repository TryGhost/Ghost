**Disassociate identity provider to your Amazon EKS Cluster**

The following ``disassociate-identity-provider-config`` example disassociates an identity provider to your Amazon EKS Cluster. ::

    aws eks disassociate-identity-provider-config \
        --cluster-name my-eks-cluster \
        --identity-provider-config 'type=oidc,name=my-identity-provider'

Output::

    {
        "update": {
            "id": "5f78d14e-c57b-4857-a3e4-cf664ae20949",
            "status": "InProgress",
            "type": "DisassociateIdentityProviderConfig",
            "params": [
                {
                    "type": "IdentityProviderConfig",
                    "value": "[]"
                }
            ],
            "createdAt": "2024-04-11T13:53:43.314000-04:00",
            "errors": []
        }
    }

For more information, see `Authenticate users for your cluster from an OpenID Connect identity provider - Disassociate an OIDC identity provider from your cluster <https://docs.aws.amazon.com/eks/latest/userguide/authenticate-oidc-identity-provider.html#disassociate-oidc-identity-provider>`__ in the *Amazon EKS User Guide*.
