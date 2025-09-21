**To update an alias**

The following ``update-alias`` example associates the alias with a different key. ::

    aws payment-cryptography update-alias \
        --alias-name alias/sampleAlias1 \
        --key-arn arn:aws:payment-cryptography:us-east-2:123456789012:key/tqv5yij6wtxx64pi 

Output::

    {
        "Alias": {
            "AliasName": "alias/sampleAlias1",
            "KeyArn": "arn:aws:payment-cryptography:us-west-2:123456789012:key/tqv5yij6wtxx64pi "
        }
    }

For more information, see `About aliases <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/alias-about.html>`__ in the *AWS Payment Cryptography User Guide*.