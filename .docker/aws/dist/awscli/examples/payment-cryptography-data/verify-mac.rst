**To verify a MAC**

The following ``verify-mac`` example verifies a Hash-Based Message Authentication Code (HMAC) for card data authentication using the algorithm HMAC_SHA256 and an HMAC encryption key. ::

    aws payment-cryptography-data verify-mac \
        --key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/qnobl5lghrzunce6 \
        --message-data "3b343038383439303031303733393431353d32343038323236303030373030303f33" \
        --verification-attributes='Algorithm=HMAC_SHA256' \
        --mac ED87F26E961C6D0DDB78DA5038AA2BDDEA0DCE03E5B5E96BDDD494F4A7AA470C

Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/qnobl5lghrzunce6,
        "KeyCheckValue": "2976E7",
    }

For more information, see `Verify MAC <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/verify-mac.html>`__ in the *AWS Payment Cryptography User Guide*.