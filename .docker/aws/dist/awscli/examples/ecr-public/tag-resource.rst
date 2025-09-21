**Example 1: To tags an existing public repository in a public registry**

The following ``tag-resource`` example tags a repository named ``project-a/nginx-web-app`` in a public registry. ::

    aws ecr-public tag-resource \
        --resource-arn arn:aws:ecr-public::123456789012:repository/project-a/nginx-web-app \
        --tags Key=stack,Value=dev \
        --region us-east-1

For more information, see `Using Tags for a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/ecr-public-using-tags.html>`__ in the *Amazon ECR Public*.

**Example 2: To tag an existing public repository with multiple tags in a public registry.**

The following ``tag-resource`` example tags an existing repository with multiple tags. ::

    aws ecr-public tag-resource \
        --resource-arn arn:aws:ecr-public::890517186334:repository/project-a/nginx-web-app  \
        --tags Key=key1,Value=value1 Key=key2,Value=value2 Key=key3,Value=value3 \
        --region us-east-1

For more information, see `Using Tags for a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/ecr-public-using-tags.html>`__ in the *Amazon ECR Public*.
