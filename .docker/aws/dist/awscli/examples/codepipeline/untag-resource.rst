**To remove AWS tags from a connections resource**

The following ``untag-resource`` example removes a tag from the specified resource. ::

    aws codepipeline untag-resource \
        --resource-arn arn:aws:codepipeline:us-east-1:123456789012:MyPipeline \
        --tag-keys Project IscontainerBased

This command produces no output.

For more information, see `Remove tags from a pipeline (CLI) <https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-tag.html#pipelines-tag-delete-cli>`__ in the *AWS CodePipeline User Guide*.