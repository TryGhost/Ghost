**To delete a repository**

The following ``delete-repository`` example command force deletes the specified repository in the default registry for an account. The ``--force`` flag is required if the repository contains images. ::

    aws ecr delete-repository \
        --repository-name ubuntu \
        --force

Output::

    {
        "repository": {
            "registryId": "123456789012",
            "repositoryName": "ubuntu",
            "repositoryArn": "arn:aws:ecr:us-west-2:123456789012:repository/ubuntu"
        }
    }

For more information, see `Deleting a Repository <https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-delete.html>`__ in the *Amazon ECR User Guide*.
