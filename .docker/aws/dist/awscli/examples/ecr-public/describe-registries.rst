**To describe all registries in a public registry**

The following ``describe-registries`` example describes all registries in your account. ::

    aws ecr-public describe-registries

Output::

   {
    "registries": [
        {
            "registryId": "123456789012",
            "registryArn": "arn:aws:ecr-public::123456789012:registry/123456789012",
            "registryUri": "public.ecr.aws/publicregistrycustomalias",
            "verified": false,
            "aliases": [
                {
                    "name": "publicregistrycustomalias",
                    "status": "ACTIVE",
                    "primaryRegistryAlias": true,
                    "defaultRegistryAlias": true
                }
            ]
        }
        ]
    }