**To remove a tag from a key**

The following ``untag-resource`` example removes a tag from a key. ::

    aws payment-cryptography untag-resource \
        --resource-arn arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --tag-keys sampleTag 

This command produces no output.

For more information, see `Managing key tags <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/manage-tags-api.html>`__ in the *AWS Payment Cryptography User Guide*.