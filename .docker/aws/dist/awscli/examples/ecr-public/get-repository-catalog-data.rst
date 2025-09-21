**To retrieve catalog metadata for a repository in a public registry**

The following ``get-repository-catalog-data`` example lists the catalog metadata for the repository ``project-a/nginx-web-app`` in a public registry. ::

    aws ecr-public get-repository-catalog-data \
        --repository-name project-a/nginx-web-app \
        --region us-east-1

Output::

    {
        "catalogData": {
            "description": "My project-a ECR Public Repository",
            "architectures": [
                "ARM",
                "ARM 64",
                "x86",
                "x86-64"
            ],
            "operatingSystems": [
                "Linux"
            ],
            "logoUrl": "https://d3g9o9u8re44ak.cloudfront.net/logo/491d3846-8f33-4d8b-a10c-c2ce271e6c0d/4f09d87c-2569-4916-a932-5c296bf6f88a.png",
            "aboutText": "## Quick reference\n\nMaintained <truncated>",
            "usageText": "## Supported architectures\n\namd64, arm64v8\n\n## <truncated>"
        }
    }

For more information, see `Repository catalog data <https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-catalog-data.html>`__ in the *Amazon ECR Public*.