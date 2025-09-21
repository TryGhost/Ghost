**To disable access to the EC2 serial console for your account**

The following ``disable-serial-console-access`` example disables account access to the serial console. ::

    aws ec2 disable-serial-console-access

Output::

    {
        "SerialConsoleAccessEnabled": false
    }

For more information, see `EC2 Serial Console <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-serial-console.html>`__ in the *Amazon EC2 User Guide*.