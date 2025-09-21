**To delete a repository policy in a public registry**

The following ``delete-repository-policy`` example delete repository policy for the ECR Public repository in your AWS account. ::

    aws ecr-public delete-repository-policy \
         --repository-name project-a/nginx-web-app \
         --region us-east-1

Output::

    {
        "registryId": "123456789012",
        "repositoryName": "project-a/nginx-web-app",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"AllowPush\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : {\n      \"AWS\" : [ \"arn:aws:iam:"123456789012":user/eksuser1\", \"arn:aws:iam:"123456789012":user/admin\" ]\n    },\n    \"Action\" : [ \"ecr-public:BatchCheckLayerAvailability\", \"ecr-public:PutImage\", \"ecr-public:InitiateLayerUpload\", \"ecr-public:UploadLayerPart\", \"ecr-public:CompleteLayerUpload\" ]\n  } ]\n}"
    }

For more information, see `Deleting a public repository policy statement <https://docs.aws.amazon.com/AmazonECR/latest/public/delete-public-repository-policy.html>`__ in the *Amazon ECR Public User Guide*.
