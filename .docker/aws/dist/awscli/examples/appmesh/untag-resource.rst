**To untag a resource**

The following ``untag-resource`` example removes a tag with the key ``key1`` from the specified resource. ::

    aws appmesh untag-resource \
        --resource-arn arn:aws:appmesh:us-east-1:123456789012:mesh/app1 \
        --tag-keys key1

This command produces no output.