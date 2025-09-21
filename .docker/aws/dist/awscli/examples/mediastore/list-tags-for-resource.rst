**To list tags for a container**

The following ``list-tags-for-resource`` example displays the tag keys and values assigned to the specified container. ::

    aws mediastore list-tags-for-resource \
        --resource arn:aws:mediastore:us-west-2:1213456789012:container/ExampleContainer

Output::

    {
        "Tags": [
            {
                "Value": "Test",
                "Key": "Environment"
            },
            {
                "Value": "West",
                "Key": "Region"
            }
        ]
    }

For more information, see `ListTagsForResource <https://docs.aws.amazon.com/mediastore/latest/apireference/API_ListTagsForResource.html>`__ in the *AWS Elemental MediaStore API Reference*.
