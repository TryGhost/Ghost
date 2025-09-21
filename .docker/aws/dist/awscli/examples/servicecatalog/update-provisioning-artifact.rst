**To update a provisioning artifact**

The following ``update-provisioning-artifact`` example updates the name and description of the specified provisioning artifact, using a JSON file to pass parameters. ::

    aws servicecatalog update-provisioning-artifact \
        --cli-input-json file://update-provisioning-artifact-input.json

Contents of ``update-provisioning-artifact-input.json``::

    {
        "ProductId": "prod-abcdfz3syn2rg",
        "ProvisioningArtifactId": "pa-pcz347abcdcfm",
        "Name": "updated name",
        "Description": "updated description"
    }

Output::

    {
        "Info": {
            "TemplateUrl": "https://awsdocs.s3.amazonaws.com/servicecatalog/myexampledevelopment-environment.template"
        },
        "Status": "AVAILABLE",
        "ProvisioningArtifactDetail": {
            "Active": true,
            "Description": "updated description",
            "Id": "pa-pcz347abcdcfm",
            "Name": "updated name",
            "Type": "CLOUD_FORMATION_TEMPLATE",
            "CreatedTime": 1562097906.0
        }
    }
