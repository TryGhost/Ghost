**To remove a tag from an instance profile**

The following ``untag-instance-profile`` command removes any tag with the key name 'Department' from the specified instance profile. ::

    aws iam untag-instance-profile \
        --instance-profile-name deployment-role \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.