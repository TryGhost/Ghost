**List identity providers associated to an Amazon EKS Cluster**

The following ``list-identity-provider-configs`` example lists identity provider associated to an Amazon EKS Cluster. ::

    aws eks list-identity-provider-configs \
        --cluster-name my-eks-cluster

Output::

    {
        "identityProviderConfigs": [
            {
                "type": "oidc",
                "name": "my-identity-provider"
            }
        ]
    }

For more information, see `Authenticate users for your cluster from an OpenID Connect identity provider <https://docs.aws.amazon.com/eks/latest/userguide/authenticate-oidc-identity-provider.html>`__ in the *Amazon EKS User Guide*.
