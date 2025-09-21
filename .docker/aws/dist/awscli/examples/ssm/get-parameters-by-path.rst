**To list parameters in a specific path**

The following ``get-parameters-by-path`` example lists the parameters within the specified hierarchy. ::

    aws ssm get-parameters-by-path \
        --path "/site/newyork/department/"

Output::

    {
        "Parameters": [
            {
                "Name": "/site/newyork/department/marketing",
                "Type": "String",
                "Value": "Floor 2",
                "Version": 1,
                "LastModifiedDate": 1530018761.888,
                "ARN": "arn:aws:ssm:us-east-1:111222333444:parameter/site/newyork/department/marketing"
            },
            {
                "Name": "/site/newyork/department/infotech",
                "Type": "String",
                "Value": "Floor 3",
                "Version": 1,
                "LastModifiedDate": 1530018823.429,
                "ARN": "arn:aws:ssm:us-east-1:111222333444:parameter/site/newyork/department/infotech"
            },
            ...
        ]
    }

For more information, see `Working with parameter hierarchies <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html>`__ in the *AWS Systems Manager User Guide*.
