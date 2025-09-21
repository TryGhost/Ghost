**To find resources that match a query**

The following ``search-resources`` example retrieves a list of all AWS resources that match the specified query. ::

    aws resource-groups search-resources \
        --resource-query file://query.json

Contents of ``query.json``::

    {
        "Type": "TAG_FILTERS_1_0",
        "Query": "{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Patch Group\", \"Values\":[\"Dev\"]}]}"
    }

Output::

    {
        "ResourceIdentifiers": [
            {
                "ResourceArn": "arn:aws:ec2:us-west-2:123456789012:instance/i-01a23bc45d67890ef",
                "ResourceType": "AWS::EC2::Instance"
            }
        ]
    }
