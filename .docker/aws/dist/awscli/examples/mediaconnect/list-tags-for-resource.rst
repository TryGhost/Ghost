**To list tags for a MediaConnect resource**

The following ``list-tags-for-resource`` example displays the tag keys and values associated with the specified MediaConnect resource. ::

    aws mediaconnect list-tags-for-resource \
        --resource-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BasketballGame

Output::

    {
        "Tags": {
            "region": "west",
            "stage": "prod"
        }
    }

For more information, see `ListTagsForResource, TagResource, UntagResource <https://docs.aws.amazon.com/mediaconnect/latest/api/tags-resourcearn.html>`__ in the *AWS Elemental MediaConnect API Reference*.
