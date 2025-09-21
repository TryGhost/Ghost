**To list services**

The following ``list-services`` example lists services. ::

    aws servicediscovery list-services

Output::

    {
        "Services": [
            {
                "Id": "srv-p5zdwlg5uvvzjita",
                "Arn": "arn:aws:servicediscovery:us-west-2:123456789012:service/srv-p5zdwlg5uvvzjita",
                "Name": "myservice",
                "DnsConfig": {
                    "RoutingPolicy": "MULTIVALUE",
                    "DnsRecords": [
                        {
                            "Type": "A",
                            "TTL": 60
                        }
                    ]
                },
                "CreateDate": 1587081768.334
            }
        ]
    }

For more information, see `Viewing a list of services <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-services.html>`__ in the *AWS Cloud Map Developer Guide*.

