**Example 1: To create a customer managed policy**

The following command creates a customer managed policy named ``my-policy``. The file ``policy.json`` is a JSON document in the current folder that grants read only access to the ``shared`` folder in an Amazon S3 bucket named ``amzn-s3-demo-bucket``. ::

    aws iam create-policy \
        --policy-name my-policy \
        --policy-document file://policy.json

Contents of policy.json::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:Get*",
                    "s3:List*"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket/shared/*"
                ]
            }
        ]
    }

Output::

    {
        "Policy": {
            "PolicyName": "my-policy",
            "CreateDate": "2015-06-01T19:31:18.620Z",
            "AttachmentCount": 0,
            "IsAttachable": true,
            "PolicyId": "ZXR6A36LTYANPAI7NJ5UV",
            "DefaultVersionId": "v1",
            "Path": "/",
            "Arn": "arn:aws:iam::0123456789012:policy/my-policy",
            "UpdateDate": "2015-06-01T19:31:18.620Z"
        }
    }

For more information on using files as input for string parameters, see `Specify parameter values for the AWS CLI <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters.html>`__ in the *AWS CLI User Guide*.

**Example 2: To create a customer managed policy with a description**

The following command creates a customer managed policy named ``my-policy`` with an immutable description. 

The file ``policy.json`` is a JSON document in the current folder that grants access to all Put, List, and Get actions for an Amazon S3 bucket named ``amzn-s3-demo-bucket``. ::

    aws iam create-policy \
        --policy-name my-policy \
        --policy-document file://policy.json \
        --description "This policy grants access to all Put, Get, and List actions for amzn-s3-demo-bucket"

Contents of policy.json::

    {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Effect": "Allow",
               "Action": [
                    "s3:ListBucket*",
                    "s3:PutBucket*",
                    "s3:GetBucket*"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket"
                ]
            }
        ]
    }

Output::

    {
        "Policy": {
            "PolicyName": "my-policy",
            "PolicyId": "ANPAWGSUGIDPEXAMPLE",
            "Arn": "arn:aws:iam::123456789012:policy/my-policy",
            "Path": "/",
            "DefaultVersionId": "v1",
            "AttachmentCount": 0,
            "PermissionsBoundaryUsageCount": 0,
            "IsAttachable": true,
            "CreateDate": "2023-05-24T22:38:47+00:00",
            "UpdateDate": "2023-05-24T22:38:47+00:00"
        }
    }

For more information on Idenity-based Policies, see `Identity-based policies and resource-based policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html>`__ in the *AWS IAM User Guide*.

**Example 3: To create a customer managed policy with tags**

The following command creates a customer managed policy named ``my-policy`` with tags. This example uses the ``--tags`` parameter with the following JSON-formatted tags: ``'{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'``. Alternatively, the ``--tags`` parameter can be used with tags in the shorthand format: ``'Key=Department,Value=Accounting Key=Location,Value=Seattle'``. 

The file ``policy.json`` is a JSON document in the current folder that grants access to all Put, List, and Get actions for an Amazon S3 bucket named ``amzn-s3-demo-bucket``. ::

    aws iam create-policy \
        --policy-name my-policy \
        --policy-document file://policy.json \
        --tags '{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'

Contents of policy.json::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket*",
                    "s3:PutBucket*",
                    "s3:GetBucket*"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket"
                ]
            }
        ]
    }

Output::

    {
        "Policy": {
            "PolicyName": "my-policy",
            "PolicyId": "ANPAWGSUGIDPEXAMPLE",
            "Arn": "arn:aws:iam::12345678012:policy/my-policy",
            "Path": "/",
            "DefaultVersionId": "v1",
            "AttachmentCount": 0,
            "PermissionsBoundaryUsageCount": 0,
            "IsAttachable": true,
            "CreateDate": "2023-05-24T23:16:39+00:00",
            "UpdateDate": "2023-05-24T23:16:39+00:00",
            "Tags": [
                {
                    "Key": "Department",
                    "Value": "Accounting"
                },
                    "Key": "Location",
                    "Value": "Seattle"
                {
            ]
        }
    }

For more information on Tagging policies, see `Tagging customer managed policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_customer-managed-policies.html>`__ in the *AWS IAM User Guide*.