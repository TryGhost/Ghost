**To remove AWS tags from a repository**

The following ``untag-resource`` example removes the tag with the specified key from the repository named ``MyDemoRepo``. ::

    aws codecommit untag-resource \
        --resource-arn arn:aws:codecommit:us-west-2:111111111111:MyDemoRepo \
        --tag-keys Status

This command produces no output.

For more information, see `Remove a Tag from a Repository <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-tag-repository-delete.html#how-to-tag-repository-delete-cli>`__ in the *AWS CodeCommit User Guide*.
