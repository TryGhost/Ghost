**Example 1: To authenticate docker to an Amazon ECR public registry**

The following ``get-login-password`` example retrieves and displays an authentication token using the GetAuthorizationToken API that you can use to authenticate to an Amazon ECR public registry. ::

    aws ecr-public get-login-password \
        --region us-east-1 
    | docker login \
        --username AWS \
        --password-stdin public.ecr.aws

This command produces no output in the terminal but instead pipes the output to Docker.

For more information, see `Authenticate to the public registry <https://docs.aws.amazon.com/AmazonECR/latest/public/public-registries.html#public-registry-auth>`__ in the *Amazon ECR Public*.

**Example 2: To authenticate docker to your own custom AmazonECR public registry**

The following ``get-login-password`` example retrieves and displays an authentication token using the GetAuthorizationToken API that you can use to authenticate to your own custom Amazon ECR public registry. ::

     aws ecr-public get-login-password \
        --region us-east-1 \
    | docker login \
        --username AWS \
        --password-stdin public.ecr.aws/<your-public-registry-custom-alias>

This command produces no output in the terminal but insteads pipes the output to Docker.

For more information, see `Authenticate to your own Amazon ECR Public <https://docs.aws.amazon.com/AmazonECR/latest/public/public-registries.html#public-registry-auth>`__ in the *Amazon ECR Public*.
