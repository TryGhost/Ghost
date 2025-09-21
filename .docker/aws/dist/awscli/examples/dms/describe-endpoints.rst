**To describe endpoints**

The following ``describe-endpoints`` example lists the endpoints in your AWS account. ::

    aws dms describe-endpoints 

Output::

    {
        "Endpoints": [
            {
                "Username": "dms",
                "Status": "active",
                "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:SF2WOFLWYWKVEOHID2EKLP3SJI",
                "ServerName": "ec2-52-32-48-61.us-west-2.compute.amazonaws.com",
                "EndpointType": "SOURCE",
                "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/94d5c4e7-4e4c-44be-b58a-c8da7adf57cd",
                "DatabaseName": "test",
                "EngineName": "mysql",
                "EndpointIdentifier": "pri100",
                "Port": 8193
            },
            {
                "Username": "admin",
                "Status": "active",
                "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:TJJZCIH3CJ24TJRU4VC32WEWFR",
                "ServerName": "test.example.com",
                "EndpointType": "SOURCE",
                "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/2431021b-1cf2-a2d4-77b2-59a9e4bce323",
                "DatabaseName": "EMPL",
                "EngineName": "oracle",
                "EndpointIdentifier": "test",
                "Port": 1521
            }
        ]
    }

For more information, see `Working with AWS DMS Endpoints <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.html>`__ in the *AWS Database Migration Service User Guide*.
