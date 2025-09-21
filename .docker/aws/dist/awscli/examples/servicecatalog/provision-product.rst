**To provision a product**

The following ``provision-product`` example provisions the specified product using the specified provisioning artifact. ::

    aws servicecatalog provision-product \
        --product-id prod-abcdfz3syn2rg \
        --provisioning-artifact-id pa-abc347pcsccfm \
        --provisioned-product-name "mytestppname3" 

Output::

    {
        "RecordDetail": {
            "RecordId": "rec-tfuawdabcdege",
            "CreatedTime": 1577222793.362,
            "ProvisionedProductId": "pp-abcd27bm4mldq",
            "PathId": "lpv2-abcdg3jp6t5k6",
            "RecordErrors": [],
            "ProductId": "prod-abcdfz3syn2rg",
            "UpdatedTime": 1577222793.362,
            "RecordType": "PROVISION_PRODUCT",
            "ProvisionedProductName": "mytestppname3",
            "ProvisioningArtifactId": "pa-pcz347abcdcfm",
            "RecordTags": [],
            "Status": "CREATED",
            "ProvisionedProductType": "CFN_STACK"
        }
    }
