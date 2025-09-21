**To verify an auth request**

The following ``verify-auth-request-cryptogram`` example verifies an Authorization Request Cryptogram (ARQC). ::

    aws payment-cryptography-data verify-auth-request-cryptogram \
        --auth-request-cryptogram F6E1BD1E6037FB3E \
        --auth-response-attributes '{"ArpcMethod1": {"AuthResponseCode": "1111"}}' \
        --key-identifier arn:aws:payment-cryptography:us-west-2:111122223333:key/pboipdfzd4mdklya \
        --major-key-derivation-mode "EMV_OPTION_A" \
        --session-key-derivation-attributes '{"EmvCommon": {"ApplicationTransactionCounter": "1234","PanSequenceNumber": "01","PrimaryAccountNumber": "471234567890123"}}' \
        --transaction-data "123456789ABCDEF" 

Output::

    {
        "AuthResponseValue": "D899B8C6FBF971AA",
        "KeyArn": "arn:aws:payment-cryptography:us-west-2:111122223333:key/pboipdfzd4mdklya",
        "KeyCheckValue": "985792"
    }

For more information, see `Verify auth request (ARQC) cryptogram <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/data-operations.verifyauthrequestcryptogram.html>`__ in the *AWS Payment Cryptography User Guide*.