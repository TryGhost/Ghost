**To remove a tag value from a resource**

The following ``untag-resource`` example removes the Department tag from the specified behavior graph. ::

  aws detective untag-resource \
      --resource-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234 \
      --tag-keys "Department"

This command produces no output.

For more information, see `Managing tags for a behavior graph <https://docs.aws.amazon.com/detective/latest/adminguide/graph-tags.html>`__ in the *Amazon Detective Administration Guide*.