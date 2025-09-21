**To describe a product as an administrator**

The following ``describe-product-as-admin`` example displays details for the specified product using administrator privileges. ::

    aws servicecatalog describe-product-as-admin \
        --id prod-abcdcek6yhbxi

Output::

    {
        "TagOptions": [],
        "ProductViewDetail": {
            "ProductARN": "arn:aws:catalog:us-west-2:687558542028:product/prod-abcdcek6yhbxi",
            "ProductViewSummary": {
                "SupportEmail": "test@amazon.com",
                "Type": "CLOUD_FORMATION_TEMPLATE",
                "Distributor": "test-distributor",
                "ShortDescription": "test-description",
                "Owner": "test-owner",
                "Id": "prodview-wi3l2j4abc6vc",
                "SupportDescription": "test-support",
                "ProductId": "prod-abcdcek6yhbxi",
                "HasDefaultPath": false,
                "Name": "test-product3",
                "SupportUrl": "https://aws.amazon.com"
            },
            "CreatedTime": 1577136715.0,
            "Status": "CREATED"
        },
        "ProvisioningArtifactSummaries": [
            {
                "CreatedTime": 1577136715.0,
                "Description": "test-version-description",
                "ProvisioningArtifactMetadata": {
                    "SourceProvisioningArtifactId": "pa-abcdxkkiv5fcm"
                },
                "Name": "test-version-name-3",
                "Id": "pa-abcdxkkiv5fcm"
            }
        ],
        "Tags": [
            {
                "Value": "iad",
                "Key": "region"
            }
        ]
    }
