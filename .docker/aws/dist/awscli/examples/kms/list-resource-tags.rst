**To get the tags on a KMS key**

The following ``list-resource-tags`` example gets the tags for a KMS key. To add or replace resource tags on KMS keys, use the ``tag-resource`` command. The output shows that this KMS key has two resource tags, each of which has a key and value.

To specify the KMS key, use the ``key-id`` parameter. This example uses a key ID value, but you can use a key ID or key ARN in this command. ::

    aws kms list-resource-tags \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab 

Output::

    {
        "Tags": [
        {
            "TagKey": "Dept",
            "TagValue": "IT"
        },
        {
            "TagKey": "Purpose",
            "TagValue": "Test"
        }
        ],
        "Truncated": false
    }

For more information about using tags in AWS KMS, see `Tagging keys <https://docs.aws.amazon.com/kms/latest/developerguide/tagging-keys.html>`__ in the *AWS Key Management Service Developer Guide*.