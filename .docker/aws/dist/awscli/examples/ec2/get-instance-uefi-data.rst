**To retrieve UEFI data from an instance**

The following ``get-instance-uefi-data`` example retrieves UEFI data from an instance. If the output is empty, the instance does not contain UEFI data. ::

    aws ec2 get-instance-uefi-data \
        --instance-id i-0123456789example

Output::

    {
        "InstanceId": "i-0123456789example",
        "UefiData": "QU1aTlVFRkkf+uLXAAAAAHj5a7fZ9+3dBzxXb/.  
        <snipped>
        AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4L/J/AODshho="
    }

For more information, see `UEFI Secure Boot <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/uefi-secure-boot.html>`__ in the *Amazon EC2 User Guide*.
