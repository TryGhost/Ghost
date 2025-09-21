**To add a tag to a role**

The following ``tag-role`` command adds a tag with a Department name to the specified role. ::

    aws iam tag-role --role-name my-role \
        --tags '{"Key": "Department", "Value": "Accounting"}'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.