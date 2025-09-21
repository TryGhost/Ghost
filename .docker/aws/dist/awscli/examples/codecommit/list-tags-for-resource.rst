**To view the AWS tags for a repository**

The following ``list-tags-for-resource`` example lists tag keys and tag values for the specified repository. ::

    aws codecommit list-tags-for-resource \
        --resource-arn arn:aws:codecommit:us-west-2:111111111111:MyDemoRepo

Output::

    {
        "tags": {
            "Status": "Secret",
            "Team": "Saanvi"
        }
    }


For more information, see `View Tags for a Repository <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-tag-repository-list.html#how-to-tag-repository-list-cli>`__ in the *AWS CodeCommit User Guide*.
