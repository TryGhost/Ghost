**To list account permissions**

The following ``list-account-permissions`` example lists your account permissions. ::

    aws inspector2 list-account-permissions

Output::

    {
        "permissions": [
            {
                "operation": "ENABLE_SCANNING",
                "service": "ECR"
            },
            {
                "operation": "DISABLE_SCANNING",
                "service": "ECR"
            },
            {
                "operation": "ENABLE_REPOSITORY",
                "service": "ECR"
            },
            {
                "operation": "DISABLE_REPOSITORY",
                "service": "ECR"
            },
            {
                "operation": "ENABLE_SCANNING",
                "service": "EC2"
            },
            {
                "operation": "DISABLE_SCANNING",
                "service": "EC2"
            },
            {
                "operation": "ENABLE_SCANNING",
                "service": "LAMBDA"
            },
            {
                "operation": "DISABLE_SCANNING",
                "service": "LAMBDA"
            }
        ]
    }

For more information, see `Identity and Access Management for Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/security-iam.html>`__ in the *Amazon Inspector User Guide*.