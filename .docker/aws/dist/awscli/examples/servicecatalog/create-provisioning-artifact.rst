**To create a provisioning artifact**

The following ``create-provisioning-artifact`` example creates a provisioning artifact, using a JSON file to pass parameters. ::

     aws servicecatalog create-provisioning-artifact \
        --cli-input-json file://create-provisioning-artifact-input.json

Contents of ``create-provisioning-artifact-input.json``::

    {
        "ProductId": "prod-nfi2abcdefghi",
        "Parameters": {
            "Name": "test-provisioning-artifact",
            "Description": "test description",
            "Info": {
                "LoadTemplateFromURL": "https://s3-us-west-1.amazonaws.com/cloudformation-templates-us-west-1/my-cfn-template.template"
            },
            "Type": "CLOUD_FORMATION_TEMPLATE"
        }
    }

Output::

    {
        "Info": {
            "TemplateUrl": "https://s3-us-west-1.amazonaws.com/cloudformation-templates-us-west-1/my-cfn-template.template"
        },
        "Status": "CREATING",
        "ProvisioningArtifactDetail": {
            "Id": "pa-bb4abcdefwnaio",
            "Name": "test-provisioning-artifact",
            "Description": "test description",
            "Active": true,
            "Type": "CLOUD_FORMATION_TEMPLATE",
            "CreatedTime": 1576022545.0
        }
    }
