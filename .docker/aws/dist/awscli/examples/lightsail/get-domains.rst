**To get information about all domains**

The following ``get-domains`` example displays details about all of the domains in the configured AWS Region.

**Note:** Lightsail's domain-related API operations are available in only the ``us-east-1`` AWS Region. If your CLI profile is configured to use a different Region, you must include the ``--region us-east-1`` parameter or the command fails. ::

    aws lightsail get-domains \
        --region us-east-1

Output::

    {
        "domains": [
            {
                "name": "example.com",
                "arn": "arn:aws:lightsail:global:111122223333:Domain/28cda903-3f15-44b2-9baf-3EXAMPLEb304",
                "supportCode": "6EXAMPLE3362//hostedzone/ZEXAMPLEONGSC1",
                "createdAt": 1570728588.6,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "global"
                },
                "resourceType": "Domain",
                "tags": [],
                "domainEntries": [
                    {
                        "id": "-1682899164",
                        "name": "example.com",
                        "target": "192.0.2.0",
                        "isAlias": false,
                        "type": "A"
                    },
                    {
                        "id": "1703104243",
                        "name": "example.com",
                        "target": "ns-137.awsdns-17.com",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "-1038331153",
                        "name": "example.com",
                        "target": "ns-4567.awsdns-21.co.uk",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "-2107289565",
                        "name": "example.com",
                        "target": "ns-333.awsdns-22.net",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "1582095705",
                        "name": "example.com",
                        "target": "ns-1111.awsdns-51.org",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "-1769796132",
                        "name": "example.com",
                        "target": "ns-1234.awsdns-21.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
                        "isAlias": false,
                        "type": "SOA"
                    },
                    {
                        "id": "1029454894",
                        "name": "_dead6a124ede046a0319eb44a4eb3cbc.example.com",
                        "target": "_be133b0a0899fb7b6bf79d9741d1a383.hkvuiqjoua.acm-validations.aws",
                        "isAlias": false,
                        "type": "CNAME"
                    }
                ]
            },
            {
                "name": "example.net",
                "arn": "arn:aws:lightsail:global:111122223333:Domain/9c9f0d70-c92e-4753-86c2-6EXAMPLE029d",
                "supportCode": "6EXAMPLE3362//hostedzone/ZEXAMPLE5TPKMV",
                "createdAt": 1556661071.384,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "global"
                },
                "resourceType": "Domain",
                "tags": [],
                "domainEntries": [
                    {
                        "id": "-766320943",
                        "name": "example.net",
                        "target": "192.0.2.2",
                        "isAlias": false,
                        "type": "A"
                    },
                    {
                        "id": "-453913825",
                        "name": "example.net",
                        "target": "ns-123.awsdns-10.net",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "1553601564",
                        "name": "example.net",
                        "target": "ns-4444.awsdns-47.co.uk",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "1653797661",
                        "name": "example.net",
                        "target": "ns-7890.awsdns-61.org",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "706414698",
                        "name": "example.net",
                        "target": "ns-123.awsdns-44.com",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "337271745",
                        "name": "example.net",
                        "target": "ns-4444.awsdns-47.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
                        "isAlias": false,
                        "type": "SOA"
                    },
                    {
                        "id": "-1785431096",
                        "name": "www.example.net",
                        "target": "192.0.2.2",
                        "isAlias": false,
                        "type": "A"
                    }
                ]
            },
            {
                "name": "example.org",
                "arn": "arn:aws:lightsail:global:111122223333:Domain/f0f13ba3-3df0-4fdc-8ebb-1EXAMPLEf26e",
                "supportCode": "6EXAMPLE3362//hostedzone/ZEXAMPLEAFO38",
                "createdAt": 1556661199.106,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "global"
                },
                "resourceType": "Domain",
                "tags": [],
                "domainEntries": [
                    {
                        "id": "2065301345",
                        "name": "example.org",
                        "target": "192.0.2.4",
                        "isAlias": false,
                        "type": "A"
                    },
                    {
                        "id": "-447198516",
                        "name": "example.org",
                        "target": "ns-123.awsdns-45.com",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "136463022",
                        "name": "example.org",
                        "target": "ns-9999.awsdns-15.co.uk",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "1395941679",
                        "name": "example.org",
                        "target": "ns-555.awsdns-01.net",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "872052569",
                        "name": "example.org",
                        "target": "ns-6543.awsdns-38.org",
                        "isAlias": false,
                        "type": "NS"
                    },
                    {
                        "id": "1001949377",
                        "name": "example.org",
                        "target": "ns-1234.awsdns-15.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
                        "isAlias": false,
                        "type": "SOA"
                    },
                    {
                        "id": "1046191192",
                        "name": "www.example.org",
                        "target": "192.0.2.4",
                        "isAlias": false,
                        "type": "A"
                    }
                ]
            }
        ]
    }
