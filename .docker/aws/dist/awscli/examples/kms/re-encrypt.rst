**Example 1: To re-encrypt an encrypted message under a different symmetric KMS key (Linux and macOS).**

The following ``re-encrypt`` command example demonstrates the recommended way to re-encrypt data with the AWS CLI.

* Provide the ciphertext in a file. 

    In the value of the ``--ciphertext-blob`` parameter, use the ``fileb://`` prefix, which tells the CLI to read the data from a binary file. If the file is not in the current directory, type the full path to file. For more information about reading AWS CLI parameter values from a file, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>`__ in the *AWS Command Line Interface User Guide* and `Best Practices for Local File Parameters <https://aws.amazon.com/blogs/developer/best-practices-for-local-file-parameters/>`__ in the *AWS Command Line Tool Blog*.

* Specify the source KMS key, which decrypts the ciphertext.

    The ``--source-key-id`` parameter is not required when decrypting with symmetric encryption KMS keys. AWS KMS can get the KMS key that was used to encrypt the data from the metadata in the ciphertext blob. But it's always a best practice to specify the KMS key you are using. This practice ensures that you use the KMS key that you intend, and prevents you from inadvertently decrypting a ciphertext using a KMS key you do not trust.

* Specify the destination KMS key, which re-encrypts the data.

    The ``--destination-key-id`` parameter is always required. This example uses a key ARN, but you can use any valid key identifier.

* Request the plaintext output as a text value.

    The ``--query`` parameter tells the CLI to get only the value of the ``Plaintext`` field from the output. The ``--output`` parameter returns the output as text. 

* Base64-decode the plaintext and save it in a file.


    The following example pipes (|) the value of the ``Plaintext`` parameter to the Base64 utility, which decodes it. Then, it redirects (>) the decoded output to the ``ExamplePlaintext`` file. 

Before running this command, replace the example key IDs with valid key identifiers from your AWS account. ::

    aws kms re-encrypt \
        --ciphertext-blob fileb://ExampleEncryptedFile \
        --source-key-id 1234abcd-12ab-34cd-56ef-1234567890ab \        
        --destination-key-id 0987dcba-09fe-87dc-65ba-ab0987654321 \
        --query CiphertextBlob \
        --output text | base64 --decode > ExampleReEncryptedFile

This command produces no output. The output from the ``re-encrypt`` command is base64-decoded and saved in a file.

For more information, see `ReEncrypt <https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html>`__ in the *AWS Key Management Service API Reference*.

**Example 2: To re-encrypt an encrypted message under a different symmetric KMS key (Windows command prompt).**

The following ``re-encrypt`` command example is the same as the previous one except that it uses the ``certutil`` utility to Base64-decode the plaintext data. This procedure requires two commands, as shown in the following examples. 

Before running this command, replace the example key ID with a valid key ID from your AWS account. ::

    aws kms re-encrypt ^
        --ciphertext-blob fileb://ExampleEncryptedFile ^
        --source-key-id 1234abcd-12ab-34cd-56ef-1234567890ab ^
        --destination-key-id 0987dcba-09fe-87dc-65ba-ab0987654321 ^
        --query CiphertextBlob ^
        --output text > ExampleReEncryptedFile.base64
        
Then use the ``certutil`` utility ::

    certutil -decode ExamplePlaintextFile.base64 ExamplePlaintextFile

Output::

    Input Length = 18
    Output Length = 12
    CertUtil: -decode command completed successfully.

For more information, see `ReEncrypt <https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html>`__ in the *AWS Key Management Service API Reference*.
