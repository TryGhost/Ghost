**Example 1: To create a repository**

The following ``create-repository`` example creates a repository inside the specified namespace in the default registry for an account. ::

    aws ecr create-repository \
        --repository-name project-a/sample-repo

Output::

    {
        "repository": {
            "registryId": "123456789012",
            "repositoryName": "project-a/sample-repo",
            "repositoryArn": "arn:aws:ecr:us-west-2:123456789012:repository/project-a/sample-repo"
        }
    }

For more information, see `Creating a Repository <https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html>`__ in the *Amazon ECR User Guide*.

**Example 2: To create a repository configured with image tag immutability**

The following ``create-repository`` example creates a repository configured for tag immutability in the default registry for an account. ::

    aws ecr create-repository \
        --repository-name project-a/sample-repo \
        --image-tag-mutability IMMUTABLE

Output::

    {
        "repository": {
            "registryId": "123456789012",
            "repositoryName": "project-a/sample-repo",
            "repositoryArn": "arn:aws:ecr:us-west-2:123456789012:repository/project-a/sample-repo",
            "imageTagMutability": "IMMUTABLE"
        }
    }

For more information, see `Image Tag Mutability <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html>`__ in the *Amazon ECR User Guide*.

**Example 3: To create a repository configured with a scanning configuration**

The following ``create-repository`` example creates a repository configured to perform a vulnerability scan on image push in the default registry for an account. ::

    aws ecr create-repository \
        --repository-name project-a/sample-repo \
        --image-scanning-configuration scanOnPush=true

Output::

    {
        "repository": {
            "registryId": "123456789012",
            "repositoryName": "project-a/sample-repo",
            "repositoryArn": "arn:aws:ecr:us-west-2:123456789012:repository/project-a/sample-repo",
            "imageScanningConfiguration": {
                "scanOnPush": true
            }
        }
    }

For more information, see `Image Scanning <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html>`__ in the *Amazon ECR User Guide*.