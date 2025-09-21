**Example 1: To describe a repository in a public registry**

The following ``describe-repositories`` example describes a repository named ``project-a/nginx-web-app`` in a public registry. ::

    aws ecr-public describe-repositories \
        --repository-name project-a/nginx-web-app

Output::

    {
        "repositories": [
            {
                "repositoryArn": "arn:aws:ecr-public::123456789012:repository/project-a/nginx-web-app",
                "registryId": "123456789012",
                "repositoryName": "project-a/nginx-web-app",
                "repositoryUri": "public.ecr.aws/public-registry-custom-alias/project-a/nginx-web-app",
                "createdAt": "2024-07-07T00:07:56.526000-05:00"
            }
        ]
    }

**Example 2: To describe all repositories in a public registry in a table**

The following ``describe-repositories`` example describes all repositories in a public registry and then outputs the repository names into a table format. ::

    aws ecr-public describe-repositories \
        --region us-east-1 \
        --output table \
        --query "repositories[*].repositoryName"

Output::

    -----------------------------
    |   DescribeRepositories    |
    +---------------------------+
    |  project-a/nginx-web-app  |
    |  nginx                    |
    |  myfirstrepo1             |
    |  helm-test-chart          |
    |  test-ecr-public          |
    |  nginx-web-app            |
    |  sample-repo              |
    +---------------------------+