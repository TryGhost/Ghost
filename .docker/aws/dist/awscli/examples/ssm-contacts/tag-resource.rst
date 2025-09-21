**To tag a contact**

The following ``tag-resource`` example tags a specified contact with the provided tag key value pair. ::

    aws ssm-contacts tag-resource \
        --resource-arn "arn:aws:ssm-contacts:us-east-1:111122223333:contact/akuam" \
        --tags '[{"Key":"group1","Value":"1"}]'

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.