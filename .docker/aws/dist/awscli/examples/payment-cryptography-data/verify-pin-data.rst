**To verify a PIN**

The following ``verify-pin-data`` example validates a PIN for a PAN. ::

    aws payment-cryptography-data verify-pin-data \
        --verification-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/37y2tsl45p5zjbh2 \
        --encryption-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt \
        --primary-account-number 171234567890123 \
        --pin-block-format ISO_FORMAT_0 \
        --verification-attributes VisaPin="{PinVerificationKeyIndex=1,VerificationValue=5507}" \
        --encrypted-pin-block AC17DC148BDA645E 

Output::

    {
        "VerificationKeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/37y2tsl45p5zjbh2",
        "VerificationKeyCheckValue": "7F2363",
        "EncryptionKeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt",
        "EncryptionKeyCheckValue": "7CC9E2",
    } 

For more information, see `Verify PIN data <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/verify-pin-data.html>`__ in the *AWS Payment Cryptography User Guide*.