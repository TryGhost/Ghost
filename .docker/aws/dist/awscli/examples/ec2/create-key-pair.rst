**To create a key pair**

This example creates a key pair named ``MyKeyPair``.

Command::

  aws ec2 create-key-pair --key-name MyKeyPair

The output is an ASCII version of the private key and key fingerprint. You need to save the key to a file.

For more information, see `Using Key Pairs`_ in the *AWS Command Line Interface User Guide*.

.. _`Using Key Pairs`: http://docs.aws.amazon.com/cli/latest/userguide/cli-ec2-keypairs.html

