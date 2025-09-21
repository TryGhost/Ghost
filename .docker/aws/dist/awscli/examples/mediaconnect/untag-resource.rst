**To remove tags from a MediaConnect resource**

The following ``untag-resource`` example remove the tag with the specified key name and its associated value from a MediaConnect resource. ::

    aws mediaconnect untag-resource \
        --resource-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BasketballGame \
        --tag-keys region

This command produces no output.

For more information, see `ListTagsForResource, TagResource, UntagResource <https://docs.aws.amazon.com/mediaconnect/latest/api/tags-resourcearn.html>`__ in the *AWS Elemental MediaConnect API Reference*.
