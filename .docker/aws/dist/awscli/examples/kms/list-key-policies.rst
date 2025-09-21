**To get the names of key policies for a KMS key**

The following ``list-key-policies`` example gets the names of the key policies for a customer managed key in the example account and Region. You can use this command to find the names of key policies for AWS managed keys and customer managed keys. 

Because the only valid key policy name is ``default``, this command is not useful.

To specify the KMS key, use the ``key-id`` parameter. This example uses a key ID value, but you can use a key ID or key ARN in this command. ::

    aws kms list-key-policies \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

Output::

    {
        "PolicyNames": [
        "default"
        ]
    }

For more information about AWS KMS key policies, see `Using Key Policies in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html>`__ in the *AWS Key Management Service Developer Guide*.