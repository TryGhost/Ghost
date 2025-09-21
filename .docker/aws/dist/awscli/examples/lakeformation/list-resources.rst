**To lists the resources managed by the Lake Formation**

The following ``list-resources`` example lists the resources matching the condition  that is managed by the Lake Formation. ::

    aws lakeformation list-resources \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "FilterConditionList": [{
            "Field": "ROLE_ARN",
            "ComparisonOperator": "CONTAINS",
            "StringValueList": [
                "123456789111"
            ]
        }],
        "MaxResults": 10
    }

Output::

    {
        "ResourceInfoList": [{
                "ResourceArn": "arn:aws:s3:::lf-data-lake-123456789111",
                "RoleArn": "arn:aws:iam::123456789111:role/LF-GlueServiceRole",
                "LastModified": "2022-07-21T02:12:46.669000+00:00"
            },
            {
                "ResourceArn": "arn:aws:s3:::lf-emr-test-123456789111",
                "RoleArn": "arn:aws:iam::123456789111:role/EMRLFS3Role",
                "LastModified": "2022-07-29T16:22:03.211000+00:00"
            }
        ]
    }

For more information, see `Managing Lake Formation permissions <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
