**To describe a provisioning artifact**

The following ``describe-provisioning-artifact`` example displays details for the specified provisioning artifact. ::

    aws servicecatalog describe-provisioning-artifact \
        --provisioning-artifact-id pa-pcz347abcdcfm \
        --product-id prod-abcdfz3syn2rg

Output::

    {
        "Info": {
            "TemplateUrl": "https://awsdocs.s3.amazonaws.com/servicecatalog/myexampledevelopment-environment.template"
        },
        "ProvisioningArtifactDetail": {
            "Id": "pa-pcz347abcdcfm",
            "Active": true,
            "Type": "CLOUD_FORMATION_TEMPLATE",
            "Description": "updated description",
            "CreatedTime": 1562097906.0,
            "Name": "updated name"
        },
        "Status": "AVAILABLE"
    }
