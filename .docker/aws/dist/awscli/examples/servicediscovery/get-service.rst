**To get the settings of a service**

The following ``get-service`` example gets the settings of a specified service. ::

    aws servicediscovery get-service \
        --id srv-e4anhexample0004

Output::

    {
        "Service": {
            "Id": "srv-e4anhexample0004",
            "Arn": "arn:aws:servicediscovery:us-west-2:111122223333:service/srv-e4anhexample0004",
            "Name": "test-service",
            "NamespaceId": "ns-e4anhexample0004",
            "DnsConfig": {},
            "Type": "HTTP",
            "CreateDate": "2025-02-24T10:59:02.905000-06:00",
            "CreatorRequestId": "3f50f9d9-b14c-482e-a556-d2a22fe6106d"
        }
    }

For more information, see `AWS Cloud Map services <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html>`__ in the *AWS Cloud Map Developer Guide*.
