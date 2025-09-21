**To retrieve the details for an AWS Shield Advanced protection**

The following ``describe-protection`` example displays details about the Shield Advanced protection with the specified ID. You can obtain protection IDs by running the ``list-protections`` command. ::

    aws shield describe-protection \
        --protection-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "Protection": {
            "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Name": "1.2.3.4",
            "ResourceArn": "arn:aws:ec2:us-west-2:123456789012:eip-allocation/eipalloc-0ac1537af40742a6d"
        }
    }

For more information, see `Specify Your Resources to Protect <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-choose-resources.html>`__ in the *AWS Shield Advanced Developer Guide*.
