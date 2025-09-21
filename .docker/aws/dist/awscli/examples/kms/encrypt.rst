**Example 1: To encrypt the contents of a file on Linux or MacOS**

The following ``encrypt`` command demonstrates the recommended way to encrypt data with the AWS CLI. ::

    aws kms encrypt \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --plaintext fileb://ExamplePlaintextFile \
        --output text \
        --query CiphertextBlob | base64 \
        --decode > ExampleEncryptedFile

The command does several things:

#. Uses the ``--plaintext`` parameter to indicate the data to encrypt. This parameter value must be base64-encoded. 

    The value of the ``plaintext`` parameter must be base64-encoded, or you must use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file.
    
    If the file is not in the current directory, type the full path to file. For example: ``fileb:///var/tmp/ExamplePlaintextFile`` or ``fileb://C:\Temp\ExamplePlaintextFile``. For more information about reading AWS CLI parameter values from a file, see `Loading Parameters from a File <https://docs.aws.amazon.com/cli/latest/userguide/cli-using-param.html#cli-using-param-file>`__ in the *AWS Command Line Interface User Guide* and `Best Practices for Local File Parameters <https://blogs.aws.amazon.com/cli/post/TxLWWN1O25V1HE/Best-Practices-for-Local-File-Parameters>`__ on the AWS Command Line Tool Blog.

#. Uses the ``--output`` and ``--query`` parameters to control the command's output.

    These parameters extract the encrypted data, called the *ciphertext*, from the command's output.

    For more information about controlling output, see `Controlling Command Output <https://docs.aws.amazon.com/cli/latest/userguide/controlling-output.html>`__ in the *AWS Command Line Interface User Guide*.

#. Uses the ``base64`` utility to decode the extracted output into binary data.

    The ciphertext that is returned by a successful ``encrypt`` command is base64-encoded text. You must decode this text before you can use the AWS CLI to decrypt it.

#. Saves the binary ciphertext to a file.

    The final part of the command (``> ExampleEncryptedFile``) saves the binary ciphertext to a file to make decryption easier. For an example command that uses the AWS CLI to decrypt data, see the `decrypt examples <decrypt.html#examples>`_.

**Example 2: Using the AWS CLI to encrypt data on Windows**

This example is the same as the previous one, except that it uses the ``certutil`` tool instead of ``base64``. This procedure requires two commands, as shown in the following example. ::

    aws kms encrypt \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --plaintext fileb://ExamplePlaintextFile \
        --output text \
        --query CiphertextBlob > C:\Temp\ExampleEncryptedFile.base64

    certutil -decode C:\Temp\ExampleEncryptedFile.base64 C:\Temp\ExampleEncryptedFile

**Example 3: Encrypting with an asymmetric KMS key**

The following ``encrypt`` command shows how to encrypt plaintext with an asymmetric KMS key. The ``--encryption-algorithm`` parameter is required. As in all ``encrypt`` CLI commands, the ``plaintext`` parameter must be base64-encoded, or you must use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file. ::

    aws kms encrypt \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --encryption-algorithm RSAES_OAEP_SHA_256 \
        --plaintext fileb://ExamplePlaintextFile \
        --output text \
        --query CiphertextBlob | base64 \
        --decode > ExampleEncryptedFile

This command produces no output.