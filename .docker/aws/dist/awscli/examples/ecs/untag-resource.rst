**To remove a tag from a resource**

The following ``untag-resource`` example removes the listed tags from the specified resource. ::

    aws ecs untag-resource \
        --resource-arn arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster \
        --tag-keys key1,key2

This command produces no output.

