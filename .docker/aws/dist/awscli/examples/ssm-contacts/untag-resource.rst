**To remove tags from a contact**

The following ``untag-resource`` example removes the group1 tag from the specified contact. ::

    aws ssm-contacts untag-resource \
        --resource-arn "arn:aws:ssm-contacts:us-east-1:111122223333:contact/akuam" \
        --tag-keys "group1"

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.