**To add a tag to a user**

The following ``tag-user`` command adds a tag with the associated Department to the specified user. ::

    aws iam tag-user \
        --user-name alice \
        --tags '{"Key": "Department", "Value": "Accounting"}'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.