**To describe the ID format for IAM users and roles with long ID format enabled**

The following ``describe-principal-id-format`` example describes the ID format for the root user, all IAM roles, and all IAM users with long ID format enabled. ::

    aws ec2 describe-principal-id-format \
        --resource instance

Output::

    {
        "Principals": [
            {
                "Arn": "arn:aws:iam::123456789012:root",
                "Statuses": [
                    {
                        "Deadline": "2016-12-15T00:00:00.000Z",
                        "Resource": "reservation",
                        "UseLongIds": true
                    },
                    {
                        "Deadline": "2016-12-15T00:00:00.000Z",
                        "Resource": "instance",
                        "UseLongIds": true
                    },
                    {
                        "Deadline": "2016-12-15T00:00:00.000Z",
                        "Resource": "volume",
                        "UseLongIds": true
                    },
                ]
            },
            ...
        ]
    }
