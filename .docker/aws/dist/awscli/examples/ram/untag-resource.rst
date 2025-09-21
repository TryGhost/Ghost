**To remove tags from a resource share**

The following ``untag-resource`` example removes the ``project`` tag key and associated value from the specified resource share. ::

    aws ram untag-resource \
        --tag-keys project \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE

This command produces no output.