**Example 1: To generate an HMAC for a message**

The following ``generate-mac`` command generates an HMAC for a message, an HMAC KMS key, and a MAC algorithm. The algorithm must be supported by the specified HMAC KMS key.

In AWS CLI v2, the value of the ``message`` parameter must be Base64-encoded. Or, you can save the message in a file and use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file.

Before running this command, replace the example key ID with a valid key ID from your AWS account. The key ID must represent a HMAC KMS key with a key usage of ``GENERATE_VERIFY_MAC``. ::

    msg=(echo 'Hello World' | base64)
    
    aws kms generate-mac \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://Message \
        --mac-algorithm HMAC_SHA_384

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "Mac": "<HMAC_TAG>",
        "MacAlgorithm": "HMAC_SHA_384"
    }

For more information about using HMAC KMS keys in AWS KMS, see `HMAC keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/hmac.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 2: To save an HMAC in a file (Linux and macOs)**

The following ``generate-mac``  example generates an HMAC for a short message stored in a local file. The command also gets the ``Mac`` property from the response, Base64-decodes it and saves it in the ExampleMac file. You can use the MAC file in a ``verify-mac`` command that verifies the MAC.

The ``generate-mac`` command requires a Base64-encoded message and a MAC algorithm that your HMAC KMS key supports. To get the MAC algorithms that your KMS key supports, use the ``describe-key`` command.

Before running this command, replace the example key ID with a valid key ID from your AWS account. The key ID must represent an asymmetric KMS key with a key usage of GENERATE_VERIFY_MAC. ::

    echo 'hello world' | base64 > EncodedMessage

    aws kms generate-mac \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://EncodedMessage \
        --mac-algorithm HMAC_SHA_384 \
        --output text \
        --query Mac | base64 --decode > ExampleMac

This command produces no output. This example extracts the ``Mac`` property of the output and saves it in a file.

For more information about using HMAC KMS keys in AWS KMS, see `HMAC keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/hmac.html>`__ in the *AWS Key Management Service Developer Guide*.
