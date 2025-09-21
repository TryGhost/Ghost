**To get the list of tags for a key**

The following ``list-tags-for-resource`` example gets the tags for a key. ::

    aws payment-cryptography list-tags-for-resource \
        --resource-arn arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h

Output::

    {
        "Tags": [
            {
                "Key": "BIN",
                "Value": "20151120"
            },
            {
                "Key": "Project",
                "Value": "Production"
            }
        ]
    }

For more information, see `Managing key tags with API operations <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/manage-tags-api.html>`__ in the *AWS Payment Cryptography User Guide*.