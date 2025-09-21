**Example 1: To generate a digital signature for a message**

The following ``sign`` example generates a cryptographic signature for a short message. The output of the command includes a base-64 encoded ``Signature`` field that you can verify by using the ``verify`` command.

You must specify a message to sign and a signing algorithm that your asymmetric KMS key supports. To get the signing algorithms for your KMS key, use the ``describe-key`` command. 

In AWS CLI v2, the value of the ``message`` parameter must be Base64-encoded. Or, you can save the message in a file and use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file.

Before running this command, replace the example key ID with a valid key ID from your AWS account. The key ID must represent an asymmetric KMS key with a key usage of SIGN_VERIFY. ::

    msg=(echo 'Hello World' | base64)
    
    aws kms sign \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://UnsignedMessage \
        --message-type RAW \
        --signing-algorithm RSASSA_PKCS1_V1_5_SHA_256

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "Signature": "ABCDEFhpyVYyTxbafE74ccSvEJLJr3zuoV1Hfymz4qv+/fxmxNLA7SE1SiF8lHw80fKZZ3bJ...",
        "SigningAlgorithm": "RSASSA_PKCS1_V1_5_SHA_256"
    }

For more information about using asymmetric KMS keys in AWS KMS, see `Asymmetric keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 2: To save a digital signature in a file (Linux and macOs)**

The following ``sign`` example generates a cryptographic signature for a short message stored in a local file. The command also gets the ``Signature`` property from the response, Base64-decodes it and saves it in the ExampleSignature file. You can use the signature file in a ``verify`` command that verifies the signature.

The ``sign`` command requires a Base64-encoded message and a signing algorithm that your asymmetric KMS key supports. To get the signing algorithms that your KMS key supports, use the ``describe-key`` command.

Before running this command, replace the example key ID with a valid key ID from your AWS account. The key ID must represent an asymmetric KMS key with a key usage of SIGN_VERIFY. ::

    echo 'hello world' | base64 > EncodedMessage
    
    aws kms sign \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://EncodedMessage \
        --message-type RAW \
        --signing-algorithm RSASSA_PKCS1_V1_5_SHA_256 \
        --output text \
        --query Signature | base64 --decode > ExampleSignature

This command produces no output. This example extracts the ``Signature`` property of the output and saves it in a file.

For more information about using asymmetric KMS keys in AWS KMS, see `Asymmetric keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html>`__ in the *AWS Key Management Service Developer Guide*.