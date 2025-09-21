**Example 1: To set a repository policy to allow a pull on the repository**

The following ``set-repository-policy`` example applies an ECR public repository policy to the specified repository to control access permissions. ::

    aws ecr-public set-repository-policy \
        --repository-name project-a/nginx-web-app \
        --policy-text file://my-repository-policy.json 

Contents of ``my-repository-policy.json``::

    {
        "Version" : "2008-10-17",
        "Statement" : [
            {
                "Sid" : "allow public pull",
                "Effect" : "Allow",
                "Principal" : "*",
                "Action" : [
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer"
                ]
            }
        ]
    }

Output::

    {
        "registryId": "12345678901",
        "repositoryName": "project-a/nginx-web-app",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"allow public pull\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : \"*\",\n    \"Action\" : [ \"ecr:BatchCheckLayerAvailability\", \"ecr:BatchGetImage\", \"ecr:GetDownloadUrlForLayer\" ]\n  } ]\n}"
    }

For more information, see `Setting a repository policy statement <https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-policy-examples.html>`__ in the *Amazon ECR Public User Guide*.

**Example 2: To set a repository policy to allow an IAM user within your account to push images**

The following ``set-repository-policy`` example allows an IAM user within your account to push images using to an ECR repository in your AWS account using the input file named ``file://my-repository-policy.json`` as policy text. ::

    aws ecr-public set-repository-policy \
        --repository-name project-a/nginx-web-app \
        --policy-text file://my-repository-policy.json 

Contents of ``my-repository-policy.json``::

    {
        "Version": "2008-10-17",
        "Statement": [
            {
                "Sid": "AllowPush",
                "Effect": "Allow",
                "Principal": {
                    "AWS": [
                        "arn:aws:iam::account-id:user/push-pull-user-1",
                        "arn:aws:iam::account-id:user/push-pull-user-2"
                    ]
                },
                "Action": [
                    "ecr-public:BatchCheckLayerAvailability",
                    "ecr-public:PutImage",
                    "ecr-public:InitiateLayerUpload",
                    "ecr-public:UploadLayerPart",
                    "ecr-public:CompleteLayerUpload"
                ]
            }
        ]
    }

Output::

    {
        "registryId": "12345678901",
        "repositoryName": "project-a/nginx-web-app",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"AllowPush\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : {\n      \"AWS\" : [ \"arn:aws:iam::12345678901:user/admin\", \"arn:aws:iam::12345678901:user/eksuser1\" ]\n    },\n    \"Action\" : [ \"ecr-public:BatchCheckLayerAvailability\", \"ecr-public:PutImage\", \"ecr-public:InitiateLayerUpload\", \"ecr-public:UploadLayerPart\", \"ecr-public:CompleteLayerUpload\" ]\n  } ]\n}"
    }

For more information, see `Setting a repository policy statement <https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-policy-examples.html>`__ in the *Amazon ECR Public User Guide*.

**Example 3: To set a repository policy to allow an IAM user from different account to push images**

The following ``set-repository-policy`` example allows a specific account to push images using cli input file://my-repository-policy.json in your AWS account. ::

    aws ecr-public set-repository-policy \
        --repository-name project-a/nginx-web-app \
        --policy-text file://my-repository-policy.json

Contents of ``my-repository-policy.json``::

    {
        "Version": "2008-10-17",
        "Statement": [
            {
                "Sid": "AllowCrossAccountPush",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::other-or-same-account-id:role/RoleName"
                },
                "Action": [
                    "ecr-public:BatchCheckLayerAvailability",
                    "ecr-public:PutImage",
                    "ecr-public:InitiateLayerUpload",
                    "ecr-public:UploadLayerPart",
                    "ecr-public:CompleteLayerUpload"
                ]
            }
        ]
   }

Output::

    {
        "registryId": "12345678901",
        "repositoryName": "project-a/nginx-web-app",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"AllowCrossAccountPush\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : {\n      \"AWS\" : \"arn:aws:iam::12345678901:role/RoleName\"\n    },\n    \"Action\" : [ \"ecr-public:BatchCheckLayerAvailability\", \"ecr-public:PutImage\", \"ecr-public:InitiateLayerUpload\", \"ecr-public:UploadLayerPart\", \"ecr-public:CompleteLayerUpload\" ]\n  } ]\n}"
    }

For more information, see `Public repository policy examples <https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-policy-examples.html>`__ in the *Amazon ECR Public User Guide*.
