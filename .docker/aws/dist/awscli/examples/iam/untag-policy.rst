**To remove a tag from a customer managed policy**

The following ``untag-policy`` command removes any tag with the key name 'Department' from the specified customer managed policy. ::

    aws iam untag-policy \
        --policy-arn arn:aws:iam::452925170507:policy/billing-access \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.