**To update a product**

The following ``update-product`` example updates the name and owner of the specified product. ::

    aws servicecatalog update-product \
        --id prod-os6abc7drqlt2 \
        --name "New product name" \
        --owner "Updated product owner"

Output::

    {
        "Tags": [
            {
                "Value": "iad",
                "Key": "region"
            }
        ],
        "ProductViewDetail": {
            "ProductViewSummary": {
                "Owner": "Updated product owner",
                "ProductId": "prod-os6abc7drqlt2",
                "Distributor": "test-distributor",
                "SupportUrl": "https://aws.amazon.com",
                "Name": "New product name",
                "ShortDescription": "test-description",
                "HasDefaultPath": false,
                "Id": "prodview-6abcdgrfhvidy",
                "SupportDescription": "test-support",
                "SupportEmail": "test@amazon.com",
                "Type": "CLOUD_FORMATION_TEMPLATE"
            },
            "Status": "CREATED",
            "ProductARN": "arn:aws:catalog:us-west-2:123456789012:product/prod-os6abc7drqlt2",
            "CreatedTime": 1577136255.0
        }
    }
