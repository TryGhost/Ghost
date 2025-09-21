**To add a tag to a customer managed policy**

The following ``tag-policy`` command adds a tag with a Department name to the specified customer managed policy. ::

    aws iam tag-policy \
        --policy-arn arn:aws:iam::123456789012:policy/billing-access \
        --tags '[{"Key": "Department", "Value": "Accounting"}]'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.