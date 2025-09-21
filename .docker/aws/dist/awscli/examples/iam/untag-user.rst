**To remove a tag from a user**

The following ``untag-user`` command removes any tag with the key name 'Department' from the specified user. ::

    aws iam untag-user \
        --user-name alice \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.