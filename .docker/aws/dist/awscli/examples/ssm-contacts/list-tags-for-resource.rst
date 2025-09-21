**To list tags for a contact**

The following ``list-tags-for-resource`` example lists the tags of the specified contact. ::

    aws ssm-contacts list-tags-for-resource \
        --resource-arn "arn:aws:ssm-contacts:us-east-1:111122223333:contact/akuam"

Output::

    {
        "Tags": [
            {
                "Key": "group1",
                "Value": "1"
            }
        ]
    }

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.