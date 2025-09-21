**To add AWS tags to an existing repository**

The following ``tag-resource`` example tags the specified repository with two tags. ::

    aws codecommit tag-resource \
        --resource-arn arn:aws:codecommit:us-west-2:111111111111:MyDemoRepo \
        --tags Status=Secret,Team=Saanvi 

This command produces no output.

For more information, see `Add a Tag to a Repository <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-tag-repository-add.html#how-to-tag-repository-add-cli>`__ in the *AWS CodeCommit User Guide*.
