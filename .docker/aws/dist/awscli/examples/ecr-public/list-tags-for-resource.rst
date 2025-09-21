**To list tags for a public repository in a public registry**

The following ``list-tags-for-resource`` example lists the tags for a resource named ``project-a/nginx-web-app`` in a public registry. ::

    aws ecr-public list-tags-for-resource \
        --resource-arn arn:aws:ecr-public::123456789012:repository/project-a/nginx-web-app \
        --region us-east-1

Output::

    {
        "tags": [
            {
                "Key": "Environment",
                "Value": "Prod"
            },
            {
                "Key": "stack",
                "Value": "dev1"
            },
            {
                "Key": "Name",
                "Value": "project-a/nginx-web-app"
            }
        ]
    }

For more information, see `List tags for a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/ecr-public-using-tags.html>`__ in the *Amazon ECR Public*.
