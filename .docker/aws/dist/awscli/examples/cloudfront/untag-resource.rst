**To remove tags from a CloudFront distribution**

The following example removes two tags from a CloudFront distribution by using
command line arguments::

    aws cloudfront untag-resource \
        --resource arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE \
        --tag-keys Items=Name,Project

Instead of using command line arguments, you can provide the tag keys in a JSON
file, as shown in the following example::

    aws cloudfront untag-resource \
        --resource arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE \
        --tag-keys file://tag-keys.json

The file ``tag-keys.json`` is a JSON document in the current folder that
contains the following::

    {
        "Items": [
            "Name",
            "Project"
        ]
    }

When successful, this command has no output.
