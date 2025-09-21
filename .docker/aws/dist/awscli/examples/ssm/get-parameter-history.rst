**To get a value history for a parameter**

The following ``get-parameter-history`` example lists the history of changes for the specified parameter, including its value. ::

    aws ssm get-parameter-history \
        --name "MyStringParameter"
  
Output::

    {
        "Parameters": [
            {
                "Name": "MyStringParameter",
                "Type": "String",
                "LastModifiedDate": 1582154711.976,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Mary-Major",
                "Description": "This is the first version of my String parameter",
                "Value": "Veni",
                "Version": 1,
                "Labels": [],
                "Tier": "Standard",
                "Policies": []
            },
            {
                "Name": "MyStringParameter",
                "Type": "String",
                "LastModifiedDate": 1582156093.471,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Mary-Major",
                "Description": "This is the second version of my String parameter",
                "Value": "Vidi",
                "Version": 2,
                "Labels": [],
                "Tier": "Standard",
                "Policies": []
            },
            {
                "Name": "MyStringParameter",
                "Type": "String",
                "LastModifiedDate": 1582156117.545,
                "LastModifiedUser": "arn:aws:iam::111222333444:user/Mary-Major",
                "Description": "This is the third version of my String parameter",
                "Value": "Vici",
                "Version": 3,
                "Labels": [],
                "Tier": "Standard",
                "Policies": []
            }
        ]
    }

For more information, see `Working with parameter versions <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html>`__ in the *AWS Systems Manager User Guide*.
