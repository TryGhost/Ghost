**Example 1: To list the tags for a workgroup**

The following ``list-tags-for-resource`` example lists the tags for the ``Data_Analyst_Group`` workgroup. ::

    aws athena list-tags-for-resource \
        --resource-arn arn:aws:athena:us-west-2:111122223333:workgroup/Data_Analyst_Group

Output::

    {
        "Tags": [
            {
                "Key": "Division",
                "Value": "West"
            },
            {
                "Key": "Team",
                "Value": "Big Data"
            },
            {
                "Key": "Location",
                "Value": "Seattle"
            }
        ]
    }
    
**Example 2: To list the tags for a data catalog**

The following ``list-tags-for-resource`` example lists the tags for the ``dynamo_db_catalog`` data catalog. ::

    aws athena list-tags-for-resource \
        --resource-arn arn:aws:athena:us-west-2:111122223333:datacatalog/dynamo_db_catalog

Output::

    {
        "Tags": [
            {
                "Key": "Division",
                "Value": "Mountain"
            },
            {
                "Key": "Organization",
                "Value": "Retail"
            },
            {
                "Key": "Product_Line",
                "Value": "Shoes"
            },
            {
                "Key": "Location",
                "Value": "Denver"
            }
        ]
    }

For more information, see `Listing the tags for a resource: list-tags-for-resource <https://docs.aws.amazon.com/athena/latest/ug/tags-operations.html#tags-operations-examples-cli-list-tags-for-resource>`__ in the *Amazon Athena User Guide*.