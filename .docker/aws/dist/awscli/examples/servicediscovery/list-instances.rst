**To list service instances**

The following ``list-instances`` example lists service instances. ::

    aws servicediscovery list-instances \
        --service-id srv-qzpwvt2tfqcegapy

Output::

    {
        "Instances": [
            {
                "Id": "i-06bdabbae60f65a4e",
                "Attributes": {
                    "AWS_INSTANCE_IPV4": "172.2.1.3",
                    "AWS_INSTANCE_PORT": "808"
                }
            }
        ]
    }

For more information, see `Viewing a list of service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-instances.html>`__ in the *AWS Cloud Map Developer Guide*.

