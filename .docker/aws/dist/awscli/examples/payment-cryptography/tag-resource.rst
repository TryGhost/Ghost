**To tag a key**

The following ``tag-resource`` example tags a key. ::

    aws payment-cryptography tag-resource \
        --resource-arn arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --tags Key=sampleTag,Value=sampleValue 

This command produces no output.

For more information, see `Managing key tags <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/manage-tags-api.html>`__ in the *AWS Payment Cryptography User Guide*.