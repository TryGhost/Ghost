**To remove a tag from a role**

The following ``untag-role`` command removes any tag with the key name 'Department' from the specified role. ::

    aws iam untag-role \
        --role-name my-role \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.