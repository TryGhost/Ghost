**To describe an accelerator**

The following ``describe-accelerator`` example retrieves the details about the specified accelerator. ::

    aws globalaccelerator describe-accelerator \
        --accelerator-arn arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh

Output::

    {
        "Accelerator": {
            "AcceleratorArn": "arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh",
            "IpAddressType": "IPV4",
            "Name": "ExampleAccelerator",
            "Enabled": true,
            "Status": "IN_PROGRESS",
            "IpSets": [
                {
                    "IpAddresses": [
                        "192.0.2.250",
                        "198.51.100.52"
                    ],
                    "IpFamily": "IPv4"
                }
            ],
            "DnsName":"a1234567890abcdef.awsglobalaccelerator.com",
            "CreatedTime": 1542394847,
            "LastModifiedTime": 1542395013
        }
    }

For more information, see `Accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-accelerators.html>`__ in the *AWS Global Accelerator Developer Guide*.