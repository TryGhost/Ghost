**To update a custom routing accelerator**

The following ``update-custom-routing-accelerator`` example modifies a custom routing accelerator to change the accelerator name. ::

    aws globalaccelerator --region us-west-2 update-custom-routing-accelerator \
        --accelerator-arn arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh \
        --name ExampleCustomRoutingAcceleratorNew

Output::

    {
        "Accelerator": {
            "AcceleratorArn": "arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh",
            "IpAddressType": "IPV4",
            "Name": "ExampleCustomRoutingAcceleratorNew",
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
            "CreatedTime": 1232394847,
            "LastModifiedTime": 1232395654
        }
    }

For more information, see `Custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-accelerators.html>`__ in the *AWS Global Accelerator Developer Guide*.