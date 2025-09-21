**To delete a key pair**

The following ``delete-key-pair`` example deletes the specified key pair. ::

    aws ec2 delete-key-pair \
        --key-name my-key-pair

Output::

    {
        "Return": true,
        "KeyPairId": "key-03c8d3aceb53b507"
    }

For more information, see `Create and delete key pairs <https://docs.aws.amazon.com/cli/latest/userguide/cli-ec2-keypairs.html>`__ in the *AWS Command Line Interface User Guide*.
