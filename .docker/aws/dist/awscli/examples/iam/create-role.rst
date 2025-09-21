**Example 1: To create an IAM role**

The following ``create-role`` command creates a role named ``Test-Role`` and attaches a trust policy to it. ::

    aws iam create-role \
        --role-name Test-Role \
        --assume-role-policy-document file://Test-Role-Trust-Policy.json

Output::

    {
        "Role": {
            "AssumeRolePolicyDocument": "<URL-encoded-JSON>",
            "RoleId": "AKIAIOSFODNN7EXAMPLE",
            "CreateDate": "2013-06-07T20:43:32.821Z",
            "RoleName": "Test-Role",
            "Path": "/",
            "Arn": "arn:aws:iam::123456789012:role/Test-Role"
        }
    }

The trust policy is defined as a JSON document in the *Test-Role-Trust-Policy.json* file. (The file name and extension do not have significance.) The trust policy must specify a principal.

To attach a permissions policy to a role, use the ``put-role-policy`` command.

For more information, see `Creating IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html>`__ in the *AWS IAM User Guide*.

**Example 2: To create an IAM role with specified maximum session duration**

The following ``create-role`` command creates a role named ``Test-Role`` and sets a maximum session duration of 7200 seconds (2 hours). ::

    aws iam create-role \
        --role-name Test-Role \
        --assume-role-policy-document file://Test-Role-Trust-Policy.json \
        --max-session-duration 7200

Output::

    {
        "Role": {
            "Path": "/",
            "RoleName": "Test-Role",
            "RoleId": "AKIAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::12345678012:role/Test-Role",
            "CreateDate": "2023-05-24T23:50:25+00:00",
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "Statement1",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:aws:iam::12345678012:root"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
        }
    }

For more information, see `Modifying a role maximum session duration (AWS API) <https://docs.aws.amazon.com/IAM/latest/UserGuide/roles-managingrole-editing-api.html#roles-modify_max-session-duration-api>`__ in the *AWS IAM User Guide*.

**Example 3: To create an IAM Role with tags**

The following command creates an IAM Role ``Test-Role`` with tags. This example uses the ``--tags`` parameter flag with the following JSON-formatted tags: ``'{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'``. Alternatively, the ``--tags`` flag can be used with tags in the shorthand format: ``'Key=Department,Value=Accounting Key=Location,Value=Seattle'``. ::

    aws iam create-role \
        --role-name Test-Role \
        --assume-role-policy-document file://Test-Role-Trust-Policy.json \
        --tags '{"Key": "Department", "Value": "Accounting"}' '{"Key": "Location", "Value": "Seattle"}'

Output:: 

    {
        "Role": {
            "Path": "/",
            "RoleName": "Test-Role",
            "RoleId": "AKIAIOSFODNN7EXAMPLE",
            "Arn": "arn:aws:iam::123456789012:role/Test-Role",
            "CreateDate": "2023-05-25T23:29:41+00:00",
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "Statement1",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:aws:iam::123456789012:root"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            },
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

For more information, see `Tagging IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_roles.html>`__ in the *AWS IAM User Guide*.
