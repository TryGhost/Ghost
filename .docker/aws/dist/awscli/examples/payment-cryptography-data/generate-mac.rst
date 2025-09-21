**To generate a MAC**

The following ``generate-card-validation-data`` example generates a Hash-Based Message Authentication Code (HMAC) for card data authentication using the algorithm HMAC_SHA256 and an HMAC encryption key. The key must have ``KeyUsage`` set to ``TR31_M7_HMAC_KEY`` and ``KeyModesOfUse`` to ``Generate``. ::

    aws payment-cryptography-data generate-mac \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --message-data "3b313038383439303031303733393431353d32343038323236303030373030303f33" \
        --generation-attributes Algorithm=HMAC_SHA256

Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h,
        "KeyCheckValue": "2976E7",
        "Mac": "ED87F26E961C6D0DDB78DA5038AA2BDDEA0DCE03E5B5E96BDDD494F4A7AA470C"
    }

For more information, see `Generate MAC  <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/generate-mac.html>`__ in the *AWS Payment Cryptography User Guide*.