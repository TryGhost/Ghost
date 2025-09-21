**To describe a provisioned product**

The following ``describe-provisioned-product`` example displays details for the specified provisioned product. ::

    aws servicecatalog describe-provisioned-product \
        --id pp-dpom27bm4abcd

Output::

    {
        "ProvisionedProductDetail": {
            "Status": "ERROR",
            "CreatedTime": 1577222793.358,
            "Arn": "arn:aws:servicecatalog:us-west-2:123456789012:stack/mytestppname3/pp-dpom27bm4abcd",
            "Id": "pp-dpom27bm4abcd",
            "StatusMessage": "AmazonCloudFormationException  Parameters: [KeyName] must have values (Service: AmazonCloudFormation; Status Code: 400; Error Code: ValidationError; Request ID: 5528602a-a9ef-427c-825c-f82c31b814f5)",
            "IdempotencyToken": "527c5358-2a1a-4b9e-b1b9-7293b0ddff42",
            "LastRecordId": "rec-tfuawdjovzxge",
            "Type": "CFN_STACK",
            "Name": "mytestppname3"
        },
        "CloudWatchDashboards": []
    }
