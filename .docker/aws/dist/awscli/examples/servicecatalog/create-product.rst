**To create a product**

The following ``create-product`` example creates a product, using a JSON file to pass parameters. ::

    aws servicecatalog create-product \
        --cli-input-json file://create-product-input.json

Contents of ``create-product-input.json``::

    {
        "AcceptLanguage": "en",
        "Name": "test-product",
        "Owner": "test-owner",
        "Description": "test-description",
        "Distributor": "test-distributor",
        "SupportDescription": "test-support",
        "SupportEmail": "test@amazon.com",
        "SupportUrl": "https://aws.amazon.com",
        "ProductType": "CLOUD_FORMATION_TEMPLATE",
        "Tags": [
            {
                "Key": "region",
                "Value": "us-east-1"
            }
        ],
        "ProvisioningArtifactParameters": {
            "Name": "test-version-name",
            "Description": "test-version-description",
            "Info": {
                "LoadTemplateFromURL": "https://s3-us-west-1.amazonaws.com/cloudformation-templates-us-west-1/my-cfn-template.template"
            },
            "Type": "CLOUD_FORMATION_TEMPLATE"
        }
    }

Output::

    {
        "Tags": [
            {
                "Key": "region",
                "Value": "us-east-1"
            }
        ],
        "ProductViewDetail": {
            "CreatedTime": 1576025036.0,
            "ProductARN": "arn:aws:catalog:us-west-2:1234568542028:product/prod-3p5abcdef3oyk",
            "Status": "CREATED",
            "ProductViewSummary": {
                "Type": "CLOUD_FORMATION_TEMPLATE",
                "Distributor": "test-distributor",
                "SupportUrl": "https://aws.amazon.com",
                "SupportEmail": "test@amazon.com",
                "Id": "prodview-abcd42wvx45um",
                "SupportDescription": "test-support",
                "ShortDescription": "test-description",
                "Owner": "test-owner",
                "Name": "test-product2",
                "HasDefaultPath": false,
                "ProductId": "prod-3p5abcdef3oyk"
            }
        },
        "ProvisioningArtifactDetail": {
            "CreatedTime": 1576025036.0,
            "Active": true,
            "Id": "pa-pq3p5lil12a34",
            "Description": "test-version-description",
            "Name": "test-version-name",
            "Type": "CLOUD_FORMATION_TEMPLATE"
        }
    }
