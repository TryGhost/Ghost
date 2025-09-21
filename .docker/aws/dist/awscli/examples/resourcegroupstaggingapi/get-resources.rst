**To get a list of tagged resources**

The following ``get-resources`` example displays a list of resources in the account that are tagged with the specified key name and value. ::

    aws resourcegroupstaggingapi get-resources \
        --tag-filters Key=Environment,Values=Production \
        --tags-per-page 100

Output::

    {
        "ResourceTagMappingList": [
            {
                "ResourceARN": " arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX/template/0-7sbz2Kz0",
                "Tags": [
                    {
                        "Key": "Environment",
                        "Value": "Production"
                    }
                ]
            }
        ]
    }

For more information, see `GetResources <https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetResources.html>`__ in the *Resource Groups Tagging API Reference*.
