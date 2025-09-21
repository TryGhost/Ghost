**To add a tag to an instance profile**

The following ``tag-instance-profile`` command adds a tag with a Department name to the specified instance profile. ::

    aws iam tag-instance-profile \
        --instance-profile-name deployment-role \
        --tags '[{"Key": "Department", "Value": "Accounting"}]'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.