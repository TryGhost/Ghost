**To create an accelerator**

The following ``create-accelerator`` example creates an accelerator with two tags with two BYOIP static IP addresses. You must specify the ``US-West-2 (Oregon)`` Region to create or update an accelerator. ::

    aws globalaccelerator create-accelerator \
        --name ExampleAccelerator \
        --tags Key="Name",Value="Example Name" Key="Project",Value="Example Project" \
        --ip-addresses 192.0.2.250 198.51.100.52

Output::

    {
        "Accelerator": {
            "AcceleratorArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh",
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
            "CreatedTime": 1542394847.0,
            "LastModifiedTime": 1542394847.0
        }
    }

For more information, see `Accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-accelerators.html>`__ in the *AWS Global Accelerator Developer Guide*.