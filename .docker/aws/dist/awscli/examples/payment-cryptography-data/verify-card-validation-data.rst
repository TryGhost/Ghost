**To validate a CVV**

The following ``verify-card-validation-data`` example validates a CVV/CVV2 for a PAN. ::

    aws payment-cryptography-data verify-card-validation-data \
        --key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/tqv5yij6wtxx64pi \
        --primary-account-number=171234567890123 \
        --verification-attributes CardVerificationValue2={CardExpiryDate=0123} \
        --validation-data 801

Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/tqv5yij6wtxx64pi",
        "KeyCheckValue": "CADDA1"
    }

For more information, see `Verify card data <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/verify-card-data.html>`__ in the *AWS Payment Cryptography User Guide*.