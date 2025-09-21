**Example 1: To list all parameters**

The following ``describe-parameters`` example lists all parameters in the current AWS account and Region. ::

    aws ssm describe-parameters

Output::

    {
        "Parameters": [
            {
                "Name": "MySecureStringParameter",
                "Type": "SecureString",
                "KeyId": "alias/aws/ssm",
                "LastModifiedDate": 1582155479.205,
                "LastModifiedUser": "arn:aws:sts::111222333444:assumed-role/Admin/Richard-Roe-Managed",
                "Description": "This is a SecureString parameter",
                "Version": 2,
                "Tier": "Advanced",
                "Policies": [
                    {
                        "PolicyText": "{\"Type\":\"Expiration\",\"Version\":\"1.0\",\"Attributes\":{\"Timestamp\":\"2020-07-07T22:30:00Z\"}}",
                        "PolicyType": "Expiration",
                        "PolicyStatus": "Pending"
                    },
                    {
                        "PolicyText": "{\"Type\":\"ExpirationNotification\",\"Version\":\"1.0\",\"Attributes\":{\"Before\":\"12\",\"Unit\":\"Hours\"}}",
                        "PolicyType": "ExpirationNotification",
                        "PolicyStatus": "Pending"
                    }
                ]
            },
            {
                "Name": "MyStringListParameter",
                "Type": "StringList",
                "LastModifiedDate": 1582154764.222,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Mary-Major",
                "Description": "This is a StringList parameter",
                "Version": 1,
                "Tier": "Standard",
                "Policies": []
            },
            {
                "Name": "MyStringParameter",
                "Type": "String",
                "LastModifiedDate": 1582154711.976,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Alejandro-Rosalez",
                "Description": "This is a String parameter",
                "Version": 1,
                "Tier": "Standard",
                "Policies": []
            },
            {
                "Name": "latestAmi",
                "Type": "String",
                "LastModifiedDate": 1580862415.521,
                "LastModifiedUser": "arn:aws:sts::111222333444:assumed-role/lambda-ssm-role/Automation-UpdateSSM-Param",
                "Version": 3,
                "Tier": "Standard",
                "Policies": []
            }
        ]
    }

**Example 2: To list all parameters matching specific metadata**

This ``describe-parameters`` example lists all parameters matching a filter.

    aws ssm describe-parameters \
        --filters "Key=Type,Values=StringList"

Output::

    {
        "Parameters": [
            {
                "Name": "MyStringListParameter",
                "Type": "StringList",
                "LastModifiedDate": 1582154764.222,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Mary-Major",
                "Description": "This is a StringList parameter",
                "Version": 1,
                "Tier": "Standard",
                "Policies": []
            }
        ]
    }

For more information, see `Searching for Systems Manager Parameters <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-search.html>`_ in the *AWS Systems Manager User Guide*.
