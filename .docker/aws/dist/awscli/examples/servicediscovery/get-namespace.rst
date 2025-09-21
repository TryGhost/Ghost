**To get the details of a namespace**

The following ``get-namespace`` example retrieves information about the specified namespace. ::

    aws servicediscovery get-namespace \
        --id ns-e4anhexample0004

Output::

    {
        "Namespaces": {
            "Arn": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-e4anhexample0004",
            "CreateDate": "20181118T211712Z",
            "CreatorRequestId": "example-creator-request-id-0001",
            "Description": "Example.com AWS Cloud Map HTTP Namespace",
            "Id": "ns-e4anhexample0004",
            "Name": "example-http.com",
            "Properties": {
                "DnsProperties": {},
                "HttpProperties": {
                    "HttpName": "example-http.com"
                }
            },
            "Type": "HTTP"
        }
    }

For more information, see `AWS Cloud Map namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.
