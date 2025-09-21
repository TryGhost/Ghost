**To create an alias for a key**

The following ``create-alias`` example creates an alias for a key. ::

    aws payment-cryptography create-alias \
        --alias-name alias/sampleAlias1 \
        --key-arn arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h

Output::

    {
        "Alias": {
            "AliasName": "alias/sampleAlias1",
            "KeyArn": "arn:aws:payment-cryptography:us-west-2:123456789012:key/kwapwa6qaifllw2h"
        }
    }

For more information, see `About aliases <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/alias-about.html>`__ in the *AWS Payment Cryptography User Guide*.