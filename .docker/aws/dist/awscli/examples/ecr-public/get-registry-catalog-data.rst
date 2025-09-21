**To retrieve catalog metadata for a public ECR registry**

The following ``get-registry-catalog-data`` retrieves catalog metadata for an ECR public registry. ::

    aws ecr-public get-registry-catalog-data \
        --region us-east-1

Output::

    {
        "registryCatalogData": {
            "displayName": "YourCustomPublicRepositoryalias"
        }
    }
