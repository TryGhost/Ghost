**To tag a resource**

The following ``tag-resource`` example adds a single tag to the specified resource. ::

    aws ecs tag-resource \
        --resource-arn arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster 
        --tags key=key1,value=value1

This command produces no output.

**To add multiple tags to a resource**

The following ``tag-resource`` example adds multiple tags to the specified resource. ::

    aws ecs tag-resource \
    --resource-arn arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster \
    --tags key=key1,value=value1 key=key2,value=value2 key=key3,value=value3

This command produces no output.