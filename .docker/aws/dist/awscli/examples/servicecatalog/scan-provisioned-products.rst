**To list all available provisioned products**

The following ``scan-provisioned-products`` example lists available provisioned products. ::

    aws servicecatalog scan-provisioned-products

Output::

    {
        "ProvisionedProducts": [
            {
                "Status": "ERROR",
                "Arn": "arn:aws:servicecatalog:us-west-2:123456789012:stack/mytestppname3/pp-abcd27bm4mldq",
                "StatusMessage": "AmazonCloudFormationException  Parameters: [KeyName] must have values (Service: AmazonCloudFormation; Status Code: 400; Error Code: ValidationError; Request ID: 5528602a-a9ef-427c-825c-f82c31b814f5)",
                "Id": "pp-abcd27bm4mldq",
                "Type": "CFN_STACK",
                "IdempotencyToken": "527c5358-2a1a-4b9e-b1b9-7293b0ddff42",
                "CreatedTime": 1577222793.358,
                "Name": "mytestppname3",
                "LastRecordId": "rec-tfuawdabcdxge"
            }
        ]
    }
