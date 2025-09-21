**To delete a repository in a public registry**

The following ``delete-repository`` example deletes a repository named ``project-a/nginx-web-app`` from your public registry. ::

    aws ecr-public delete-repository \
        --repository-name project-a/nginx-web-app

Output::

    {
        "repository": {
            "repositoryArn": "arn:aws:ecr-public::123456789012:repository/project-a/nginx-web-app",
            "registryId": "123456789012",
            "repositoryName": "project-a/nginx-web-app",
            "repositoryUri": "public.ecr.aws/public-registry-custom-alias/project-a/nginx-web-app",
            "createdAt": "2024-07-01T22:14:50.103000+00:00"
        }
    }

For more information, see `Deleting a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-delete.html>`__ in the *Amazon ECR Public*.
