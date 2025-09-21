**To generate a CVV**

The following ``generate-card-validation-data`` example generates a CVV/CVV2. ::

    aws payment-cryptography-data generate-card-validation-data \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --primary-account-number=171234567890123 \
        --generation-attributes CardVerificationValue2={CardExpiryDate=0123}
        
Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h",
        "KeyCheckValue": "CADDA1",
        "ValidationData": "801"
    }

For more information, see `Generate card data  <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/generate-card-data.html>`__ in the *AWS Payment Cryptography User Guide*.