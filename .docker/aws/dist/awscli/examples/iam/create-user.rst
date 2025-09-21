**Example 1: To create an IAM user**

The following ``create-user`` command creates an IAM user named ``Bob`` in the current account. ::

    aws iam create-user \
        --user-name Bob

Output::

    {
        "User": {
            "UserName": "Bob",
            "Path": "/",
            "CreateDate": "2023-06-08T03:20:41.270Z",
            "UserId": "AIDAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::123456789012:user/Bob"
        }
    }

For more information, see `Creating an IAM user in your AWS account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html>`__ in the *AWS IAM User Guide*.

**Example 2: To create an IAM user at a specified path**

The following ``create-user`` command creates an IAM user named ``Bob`` at the specified path. ::

    aws iam create-user \
        --user-name Bob \
        --path /division_abc/subdivision_xyz/

Output:: 

    {
        "User": {
            "Path": "/division_abc/subdivision_xyz/",
            "UserName": "Bob",
            "UserId": "AIDAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::12345678012:user/division_abc/subdivision_xyz/Bob",
            "CreateDate": "2023-05-24T18:20:17+00:00"
        }
    }

For more information, see `IAM identifiers <https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html>`__ in the *AWS IAM User Guide*.

**Example 3: To Create an IAM User with tags**

The following ``create-user`` command creates an IAM user named ``Bob`` with tags. This example uses the ``--tags`` parameter flag with the following 
JSON-formatted tags: ``'{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'``. Alternatively, the ``--tags`` flag can be used with tags in the shorthand format: ``'Key=Department,Value=Accounting Key=Location,Value=Seattle'``. ::

    aws iam create-user \
        --user-name Bob \
        --tags '{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'

Output::

    {
        "User": {
            "Path": "/",
            "UserName": "Bob",
            "UserId": "AIDAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::12345678012:user/Bob",
            "CreateDate": "2023-05-25T17:14:21+00:00",
            "Tags": [
                {
                    "Key": "Department",
                    "Value": "Accounting"
                },
                {
                    "Key": "Location",
                    "Value": "Seattle"
                }
            ]
        }
    }

For more information, see `Tagging IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_users.html>`__ in the *AWS IAM User Guide*.

**Example 3: To create an IAM user with a set permissions boundary**

The following ``create-user`` command creates an IAM user named ``Bob`` with the permissions boundary of AmazonS3FullAccess. ::

    aws iam create-user \
        --user-name Bob \
        --permissions-boundary arn:aws:iam::aws:policy/AmazonS3FullAccess

Output::

    {
        "User": {
            "Path": "/",
            "UserName": "Bob",
            "UserId": "AIDAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::12345678012:user/Bob",
            "CreateDate": "2023-05-24T17:50:53+00:00",
            "PermissionsBoundary": {
            "PermissionsBoundaryType": "Policy",
            "PermissionsBoundaryArn": "arn:aws:iam::aws:policy/AmazonS3FullAccess"
            }
        }
    }

For more information, see `Permissions boundaries for IAM entities <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html>`__ in the *AWS IAM User Guide*.