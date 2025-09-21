**To list tags for a resource**

The following ``list-tags-for-resource`` lists tags for the specified resource. ::

    aws route53profiles list-tags-for-resource \
        --resource-arn arn:aws:route53profiles:us-east-1:123456789012:profile/rp-4987774726example

Output::

    {
        "Tags": {
            "my-key-2": "my-value-2",
            "my-key-1": "my-value-1"
        }
    }