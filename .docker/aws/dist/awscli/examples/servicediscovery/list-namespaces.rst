**To list namespaces**

The following ``list-namespaces`` example lists namespaces. ::

    aws servicediscovery list-namespaces

Output::

    {
        "Namespaces": [
            {
                "Arn": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-a3ccy2e7e3a7rile",
                "CreateDate": 1585354387.357,
                "Id": "ns-a3ccy2e7e3a7rile",
                "Name": "local",
                "Properties": {
                    "DnsProperties": {
                        "HostedZoneId": "Z06752353VBUDTC32S84S"
                    },
                    "HttpProperties": {
                        "HttpName": "local"
                     }
                },
                "Type": "DNS_PRIVATE"
            },
            {
                "Arn": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-pocfyjtrsmwtvcxx",
                "CreateDate": 1586468974.698,
                "Description": "My second namespace",
                "Id": "ns-pocfyjtrsmwtvcxx",
                "Name": "My-second-namespace",
                "Properties": {
                    "DnsProperties": {},
                    "HttpProperties": {
                        "HttpName": "My-second-namespace"
                    }
                },
                "Type": "HTTP"
            },
            {
                "Arn": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-ylexjili4cdxy3xm",
                "CreateDate": 1587055896.798,
                "Id": "ns-ylexjili4cdxy3xm",
                "Name": "example.com",
                "Properties": {
                    "DnsProperties": {
                        "HostedZoneId": "Z09983722P0QME1B3KC8I"
                    },
                     "HttpProperties": {
                         "HttpName": "example.com"
                    }
                },
                "Type": "DNS_PRIVATE"
            }
        ]
    }

For more information, see `Viewing a list of namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.