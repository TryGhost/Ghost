**To create a service**

The following ``create-service`` example creates a service. ::

    aws servicediscovery create-service \
        --name myservice \
        --namespace-id  ns-ylexjili4cdxy3xm \
        --dns-config "NamespaceId=ns-ylexjili4cdxy3xm,RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=60}]"

Output::

    {
            "Service": {
            "Id": "srv-p5zdwlg5uvvzjita",
            "Arn": "arn:aws:servicediscovery:us-west-2:803642222207:service/srv-p5zdwlg5uvvzjita",
            "Name": "myservice",
            "NamespaceId": "ns-ylexjili4cdxy3xm",
            "DnsConfig": {
                "NamespaceId": "ns-ylexjili4cdxy3xm",
                "RoutingPolicy": "MULTIVALUE",
                "DnsRecords": [
                    {
                        "Type": "A",
                        "TTL": 60
                    }
                ]
            },
            "CreateDate": 1587081768.334,
            "CreatorRequestId": "567c1193-6b00-4308-bd57-ad38a8822d25"
        }
    }

For more information, see `Creating services <https://docs.aws.amazon.com/cloud-map/latest/dg/creating-services.html>`__ in the *AWS Cloud Map Developer Guide*.

