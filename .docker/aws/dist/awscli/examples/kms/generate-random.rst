**Example 1: To generate a 256-bit random byte string (Linux or macOs)**

The following ``generate-random`` example generates a 256-bit (32-byte), base64-encoded random byte string. The example decodes the byte string and saves it in the `random` file. 

When you run this command, you must use the ``number-of-bytes`` parameter to specify the length of the random value in bytes.

You don't specify a KMS key when you run this command. The random byte string is unrelated to any KMS key. 

By default, AWS KMS generates the random number. However, if you specify a `custom key store <https://docs.aws.amazon.com/kms/latest/developerguide/custom-key-store-overview.html>`__, the random byte string is generated in the AWS CloudHSM cluster associated with the custom key store.

This example uses the following parameters and values:

* It uses the required ``--number-of-bytes`` parameter with a value of ``32`` to request a 32-byte (256-bit) string. 
* It uses the ``--output`` parameter with a value of ``text`` to direct the AWS CLI to return the output as text, instead of JSON. 
* It uses the ``--query parameter`` to extract the value of the ``Plaintext`` property from the response.
* It pipes ( | ) the output of the command to the ``base64`` utility, which decodes the extracted output. 
* It uses the redirection operator ( > ) to save decoded byte string to the ``ExampleRandom`` file.
* It uses the redirection operator ( > ) to save the binary ciphertext to a file. ::

    aws kms generate-random \
        --number-of-bytes 32 \
        --output text \
        --query Plaintext | base64 --decode > ExampleRandom

This command produces no output.

For more information, see `GenerateRandom <https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateRandom.html>`__ in the *AWS Key Management Service API Reference*.

**Example 2: To generate a 256-bit random number (Windows Command Prompt)**

The following example uses the ``generate-random`` command to generate a 256-bit (32-byte), base64-encoded random byte string. The example decodes the byte string and saves it in the `random` file. This example is the same as the previous example, except that it uses the ``certutil`` utility in Windows to base64-decode the random byte string before saving it in a file. 

First, generate a base64-encoded random byte string and saves it in a temporary file, ``ExampleRandom.base64``. ::

    aws kms generate-random \
        --number-of-bytes 32 \
        --output text \
        --query Plaintext > ExampleRandom.base64

Because the output of the ``generate-random`` command is saved in a file, this example produces no output.

Now use the ``certutil -decode`` command to decode the base64-encoded byte string in the ``ExampleRandom.base64`` file. Then, it saves the decoded byte string in the ``ExampleRandom`` file. ::

    certutil -decode ExampleRandom.base64 ExampleRandom

Output::

    Input Length = 18
    Output Length = 12
    CertUtil: -decode command completed successfully.

For more information, see `GenerateRandom <https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateRandom.html>`__ in the *AWS Key Management Service API Reference*.