**To create an inbound Resolver endpoint**

The following ``create-resolver-endpoint`` example creates an inbound Resolver endpoint. You can use the same command to create both inbound and outbound endpoints.

    aws route53resolver create-resolver-endpoint \
        --name my-inbound-endpoint \ 
        --creator-request-id 2020-01-01-18:47 \ 
        --security-group-ids "sg-f62bexam" \
        --direction INBOUND \
        --ip-addresses SubnetId=subnet-ba47exam,Ip=192.0.2.255 SubnetId=subnet-12d8exam,Ip=192.0.2.254 

Output::

    {
        "ResolverEndpoint": {
            "Id": "rslvr-in-f9ab8a03f1example",
            "CreatorRequestId": "2020-01-01-18:47",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-in-f9ab8a03f1example",
            "Name": "my-inbound-endpoint",
            "SecurityGroupIds": [
                "sg-f62bexam"
            ],
            "Direction": "INBOUND",
            "IpAddressCount": 2,
            "HostVPCId": "vpc-304examp",
            "Status": "CREATING",
            "StatusMessage": "[Trace id: 1-5dc1ff84-f3477826e4a190025example] Creating the Resolver Endpoint",
            "CreationTime": "2020-01-01T23:02:29.583Z",
            "ModificationTime": "2020-01-01T23:02:29.583Z"
        }
    }

**To create an outbound Resolver endpoint**

The following ``create-resolver-endpoint`` example creates an outbound resolver endpoint using the values in the JSON-formatted document ``create-outbound-resolver-endpoint.json``. :: 

    aws route53resolver create-resolver-endpoint \
        --cli-input-json file://c:\temp\create-outbound-resolver-endpoint.json

Contents of ``create-outbound-resolver-endpoint.json``::

    {
       "CreatorRequestId": "2020-01-01-18:47",
       "Direction": "OUTBOUND",
       "IpAddresses": [ 
          { 
             "Ip": "192.0.2.255",
             "SubnetId": "subnet-ba47exam"
          },
          { 
             "Ip": "192.0.2.254",
             "SubnetId": "subnet-12d8exam"
          }
       ],
       "Name": "my-outbound-endpoint",
       "SecurityGroupIds": [ "sg-05cd7b25d6example" ],
       "Tags": [ 
          { 
             "Key": "my-key-name",
             "Value": "my-key-value"
          }
       ]
    }

For more information, see `Resolving DNS Queries Between VPCs and Your Network <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html>`__ in the *Amazon Route 53 Developer Guide*.
