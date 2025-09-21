**Example 1: To decrypt an encrypted message with a symmetric KMS key (Linux and macOS)**

The following ``decrypt`` command example demonstrates the recommended way to decrypt data with the AWS CLI. This version shows how to decrypt data under a symmetric KMS key.

* Provide the ciphertext in a file.

    In the value of the ``--ciphertext-blob`` parameter, use the ``fileb://`` prefix, which tells the CLI to read the data from a binary file. If the file is not in the current directory, type the full path to file. For more information about reading AWS CLI parameter values from a file, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>` in the *AWS Command Line Interface User Guide* and `Best Practices for Local File Parameters<https://aws.amazon.com/blogs/developer/best-practices-for-local-file-parameters/>` in the *AWS Command Line Tool Blog*.

* Specify the KMS key to decrypt the ciphertext.

    The ``--key-id`` parameter is not required when decrypting with a symmetric KMS key. AWS KMS can get the key ID of the KMS key that was used to encrypt the data from the metadata in the ciphertext. But it's always a best practice to specify the KMS key you are using. This practice ensures that you use the KMS key that you intend, and prevents you from inadvertently decrypting a ciphertext using a KMS key you do not trust.

* Request the plaintext output as a text value.

    The ``--query`` parameter tells the CLI to get only the value of the ``Plaintext`` field from the output. The ``--output`` parameter returns the output as text. 

* Base64-decode the plaintext and save it in a file.

    The  following example pipes (|) the value of the ``Plaintext`` parameter to the Base64 utility, which decodes it. Then, it redirects (>) the decoded output to the ``ExamplePlaintext`` file. 

Before running this command, replace the example key ID with a valid key ID from your AWS account. ::

    aws kms decrypt \
        --ciphertext-blob fileb://ExampleEncryptedFile \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --output text \
        --query Plaintext | base64 \
        --decode > ExamplePlaintextFile

This command produces no output. The output from the ``decrypt`` command is base64-decoded and saved in a file.

For more information, see `Decrypt <https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html>`__ in the *AWS Key Management Service API Reference*.

**Example 2: To decrypt an encrypted message with a symmetric KMS key (Windows command prompt)**

The following example is the same as the previous one except that it uses the ``certutil`` utility to Base64-decode the plaintext data. This procedure requires two commands, as shown in the following examples. 

Before running this command, replace the example key ID with a valid key ID from your AWS account. ::

    aws kms decrypt ^
        --ciphertext-blob fileb://ExampleEncryptedFile ^
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab ^
        --output text ^
        --query Plaintext > ExamplePlaintextFile.base64

Run the ``certutil`` command. ::

    certutil -decode ExamplePlaintextFile.base64 ExamplePlaintextFile

Output::

    Input Length = 18
    Output Length = 12
    CertUtil: -decode command completed successfully.

For more information, see `Decrypt <https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html>`__ in the *AWS Key Management Service API Reference*.

**Example 3: To decrypt an encrypted message with an asymmetric KMS key (Linux and macOS)**

The following ``decrypt`` command example shows how to decrypt data encrypted under an RSA asymmetric KMS key.

When using an asymmetric KMS key, the ``encryption-algorithm`` parameter, which specifies the algorithm used to encrypt the plaintext, is required.

Before running this command, replace the example key ID with a valid key ID from your AWS account. ::

    aws kms decrypt \
        --ciphertext-blob fileb://ExampleEncryptedFile \
        --key-id 0987dcba-09fe-87dc-65ba-ab0987654321 \
        --encryption-algorithm RSAES_OAEP_SHA_256 \
        --output text \
        --query Plaintext | base64 \
        --decode > ExamplePlaintextFile

This command produces no output. The output from the ``decrypt`` command is base64-decoded and saved in a file.

For more information, see `Asymmetric keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html>`__ in the *AWS Key Management Service Developer Guide*.