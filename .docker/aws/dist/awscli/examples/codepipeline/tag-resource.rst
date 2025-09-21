**To tag a resource**

The following ``tag-resource`` example associates a set of provided tags with a pipeline. Use this command to add or edit tags. ::

    aws codepipeline tag-resource \
        --resource-arn arn:aws:codepipeline:us-east-1:123456789012:MyPipeline \
        --tags key=Project,value=ProjectA key=IscontainerBased,value=true

This command produces no output.

For more information, see `Add tags to a pipeline (CLI) <https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-tag.html#pipelines-tag-add-cli>`__ in the *AWS CodePipeline User Guide*.