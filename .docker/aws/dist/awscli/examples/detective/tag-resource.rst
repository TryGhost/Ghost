**To assign a tag to a resource**

The following ``tag-resource`` example assigns a value for the Department tag to the specified behavior graph. ::

    aws detective tag-resource \
        --resource-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234 \
        --tags '{"Department":"Finance"}'

This command produces no output.

For more information, see `Managing tags for a behavior graph <https://docs.aws.amazon.com/detective/latest/adminguide/graph-tags.html>`__ in the *Amazon Detective Administration Guide*.