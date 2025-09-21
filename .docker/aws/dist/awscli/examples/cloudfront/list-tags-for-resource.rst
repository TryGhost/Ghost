**To list tags for a CloudFront distribution**

The following example gets a list of the tags for a CloudFront distribution::

    aws cloudfront list-tags-for-resource \
        --resource arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE

Output::

    {
        "Tags": {
            "Items": [
                {
                    "Key": "DateCreated",
                    "Value": "2019-12-04"
                },
                {
                    "Key": "Name",
                    "Value": "Example name"
                },
                {
                    "Key": "Project",
                    "Value": "Example project"
                }
            ]
        }
    }
