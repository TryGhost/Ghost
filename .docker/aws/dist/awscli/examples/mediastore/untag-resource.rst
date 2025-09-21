**To remove tags from a container**

The following ``untag-resource`` example removes the specified tag key and its associated value from a container. ::

    aws mediastore untag-resource \
        --resource arn:aws:mediastore:us-west-2:123456789012:container/ExampleContainer \
        --tag-keys Region

This command produces no output.

For more information, see `UntagResource <https://docs.aws.amazon.com/mediastore/latest/apireference/API_UntagResource.html>`__ in the *AWS Elemental MediaStore API Reference.*.
