**To tag a CloudFront distribution**

The following ``tag-resource`` example adds two tags to the specified CloudFront distribution. ::

    aws cloudfront tag-resource \
        --resource arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE \
        --tags 'Items=[{Key=Name,Value="Example name"},{Key=Project,Value="Example project"}]'

Instead of using command line arguments, you can provide the tags in a JSON file, as shown in the following example::

    aws cloudfront tag-resource \
        --resource arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE \
        --tags file://tags.json

Contents of ``tags.json``::

    {
        "Items": [
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

This command produces no output.
