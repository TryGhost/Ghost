**To get an alias**

The following ``get-alias`` example returns the ARN of the key associated with the alias. ::

    aws payment-cryptography get-alias \
        --alias-name alias/sampleAlias1

Output::

    {
        "Alias": {
            "AliasName": "alias/sampleAlias1",
            "KeyArn": "arn:aws:payment-cryptography:us-west-2:123456789012:key/kwapwa6qaifllw2h"
        }
    }

For more information, see `About aliases <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/alias-about.html>`__ in the *AWS Payment Cryptography User Guide*.