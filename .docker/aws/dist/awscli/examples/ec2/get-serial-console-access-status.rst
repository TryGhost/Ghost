**To view the status of account access to the serial console**

The following ``get-serial-console-access-status`` example determines whether serial console access is enabled for your account. ::

    aws ec2 get-serial-console-access-status

Output::

    {
        "SerialConsoleAccessEnabled": true
    }

For more information, see `EC2 Serial Console <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-serial-console.html>`__ in the *Amazon EC2 User Guide*.