**To verify a digital signature**

The following ``verify`` command verifies a cryptographic signature for a short, Base64-encoded message. The key ID, message, message type, and signing algorithm must be same ones that were used to sign the message.

In AWS CLI v2, the value of the ``message`` parameter must be Base64-encoded. Or, you can save the message in a file and use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file.

The signature that you specify cannot be base64-encoded. For help decoding the signature that the ``sign`` command returns, see the ``sign`` command examples.

The output of the command includes a Boolean ``SignatureValid`` field that indicates that the signature was verified. If the signature validation fails, the ``verify`` command fails, too.

Before running this command, replace the example key ID with a valid key ID from your AWS account. ::

    aws kms verify \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://EncodedMessage \
        --message-type RAW \
        --signing-algorithm RSASSA_PKCS1_V1_5_SHA_256 \
        --signature fileb://ExampleSignature

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "SignatureValid": true,
        "SigningAlgorithm": "RSASSA_PKCS1_V1_5_SHA_256"
    }

For more information about using asymmetric KMS keys in AWS KMS, see `Using asymmetric keys <https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html>`__ in the *AWS Key Management Service Developer Guide*.