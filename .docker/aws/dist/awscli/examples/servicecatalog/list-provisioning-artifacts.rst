**To list all provisioning artifacts for a product**

The following ``list-provisioning-artifacts`` example lists all provisioning artifacts for the specified product. ::

    aws servicecatalog list-provisioning-artifacts \
        --product-id prod-nfi2abcdefgcpw

Output::

    {
        "ProvisioningArtifactDetails": [
            {
                "Id": "pa-abcdef54ipm6z",
                "Description": "test-version-description",
                "Type": "CLOUD_FORMATION_TEMPLATE",
                "CreatedTime": 1576021147.0,
                "Active": true,
                "Name": "test-version-name"
            },
            {
                "Id": "pa-bb4zyxwwnaio",
                "Description": "test description",
                "Type": "CLOUD_FORMATION_TEMPLATE",
                "CreatedTime": 1576022545.0,
                "Active": true,
                "Name": "test-provisioning-artifact-2"
            }
        ]
    }
