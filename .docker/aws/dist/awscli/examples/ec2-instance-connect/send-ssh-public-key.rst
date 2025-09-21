**To send a an SSH public key to an instance**

The following ``send-ssh-public-key`` example sends the specified SSH public key to the specified instance. The key is used to authenticate the specified user. ::

    aws ec2-instance-connect send-ssh-public-key \
        --instance-id i-1234567890abcdef0 \
        --instance-os-user ec2-user \
        --availability-zone us-east-2b \
        --ssh-public-key file://path/my-rsa-key.pub

This command produces no output.
