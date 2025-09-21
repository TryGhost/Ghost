**To retrieve a password to authenticate to a registry**

The following ``get-login-password`` displays a password that you can use with a container client of your choice to authenticate to any Amazon ECR registry that your IAM principal has access to. ::

    aws ecr get-login-password

Output::

    <password>

To use with the Docker CLI, pipe the output of the ``get-login-password`` command to the ``docker login`` command. When retrieving the password, ensure that you specify the same Region that your Amazon ECR registry exists in. ::

    aws ecr get-login-password \
        --region <region> \
    | docker login \
        --username AWS \
        --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

For more information, see `Registry Authentication <https://docs.aws.amazon.com/AmazonECR/latest/userguide/Registries#registry_auth>`__ in the *Amazon ECR User Guide*.
