**To create or update catalog metadata for a public ECR registry**

The following ``put-registry-catalog-data`` creates or updates catalog metadata for an ECR public registry. Only accounts that have the verified account badge can have a registry display name. ::

    aws ecr-public put-registry-catalog-data \
        --region us-east-1 \
        --display-name <YourCustomPublicRepositoryalias>

Output::

    {
        "registryCatalogData": {
            "displayName": "YourCustomPublicRepositoryalias"
        }
    }
