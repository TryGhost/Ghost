**To get a repository policy associated with the repository**

The following ``get-repository-policy`` example gets a repository policy associated with the repository. ::

    aws ecr-public get-repository-policy \
        --repository-name project-a/nginx-web-app \
        --region us-east-1

Output::

    {
        "registryId": "123456789012",
        "repositoryName": "project-a/nginx-web-app",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"AllowPush\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : {\n      \"AWS\" : [ \"arn:aws:iam::123456789012:user/eksuser1\", \"arn:aws:iam::123456789012:user/admin\" ]\n    },\n    \"Action\" : [ \"ecr-public:BatchCheckLayerAvailability\", \"ecr-public:PutImage\", \"ecr-public:InitiateLayerUpload\", \"ecr-public:UploadLayerPart\", \"ecr-public:CompleteLayerUpload\" ]\n  } ]\n}"
    }

For more information, see `Use GetRepositoryPolicy with an AWS SDK or CLI <https://docs.aws.amazon.com/AmazonECR/latest/userguide/example_ecr_GetRepositoryPolicy_section.html>`__ in the *Amazon ECR Public User Guide*.