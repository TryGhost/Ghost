**To untag a repository**

The following ``untag-resource`` example removes the tag with the key ``Stage`` from the ``hello-world`` repository. ::

    aws ecr untag-resource \
        --resource-arn arn:aws:ecr:us-west-2:012345678910:repository/hello-world \
        --tag-keys Stage

This command produces no output.
