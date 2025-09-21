**To get a list of aliases**

The following ``list-aliases`` example shows all of the aliases in your account in this Region. ::

    aws payment-cryptography list-aliases

Output::

    {
        "Aliases": [
            {
                "AliasName": "alias/sampleAlias1",
                "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h"
            },
            {
                "AliasName": "alias/sampleAlias2",
                "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h"
            }
        ]
    }

For more information, see `About aliases <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/alias-about.html>`__ in the *AWS Payment Cryptography User Guide*.