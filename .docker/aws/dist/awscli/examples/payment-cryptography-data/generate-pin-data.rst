**To generate a PIN**

The following ``generate-card-validation-data`` example generate a new random PIN using the Visa PIN scheme. ::

    aws payment-cryptography-data generate-pin-data \
        --generation-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/37y2tsl45p5zjbh2 \
        --encryption-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt \
        --primary-account-number 171234567890123 \
        --pin-block-format ISO_FORMAT_0 \
        --generation-attributes VisaPin={PinVerificationKeyIndex=1}

Output::

    {
        "GenerationKeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/37y2tsl45p5zjbh2",
        "GenerationKeyCheckValue": "7F2363",
        "EncryptionKeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt",
        "EncryptionKeyCheckValue": "7CC9E2",
        "EncryptedPinBlock": "AC17DC148BDA645E",
        "PinData": {
            "VerificationValue": "5507"
        }
    } 

For more information, see `Generate PIN data  <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/generate-pin-data.html>`__ in the *AWS Payment Cryptography User Guide*.