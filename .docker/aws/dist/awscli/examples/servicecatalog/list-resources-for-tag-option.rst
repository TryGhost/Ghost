**To list resources associated to a TagOption**

The following ``list-resources-for-tag-option`` example lists the resources associated with the specified ``TagOption``. ::

    aws servicecatalog list-resources-for-tag-option \
        --tag-option-id tag-p3tej2abcd5qc

Output::

    {
        "ResourceDetails": [
            {
                "ARN": "arn:aws:catalog:us-west-2:123456789012:product/prod-abcdfz3syn2rg",
                "Name": "my product",
                "Description": "description",
                "CreatedTime": 1562097906.0,
                "Id": "prod-abcdfz3syn2rg"
            }
        ]
    }
