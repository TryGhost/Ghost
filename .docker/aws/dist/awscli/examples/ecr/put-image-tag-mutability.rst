**To update the image tag mutability setting for a repository**

The following ``put-image-tag-mutability`` example configures the specified repository for tag immutability. This prevents all image tags within the repository from being overwritten. ::

    aws ecr put-image-tag-mutability \
        --repository-name hello-repository \
        --image-tag-mutability IMMUTABLE

Output::

    {
       "registryId": "012345678910",
       "repositoryName": "sample-repo",
       "imageTagMutability": "IMMUTABLE"
    }

For more information, see `Image Tag Mutability <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html>`__ in the *Amazon ECR User Guide*.
