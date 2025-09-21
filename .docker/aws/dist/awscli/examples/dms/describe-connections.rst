**To describe connections**

The following ``describe-connections`` example lists the connections that you have tested between a replication instance and an endpoint. ::

    aws dms describe-connections 

Output::

    {
        "Connections": [
            {
                "Status": "successful",
                "ReplicationInstanceIdentifier": "test",
                "EndpointArn": "arn:aws:dms:us-east-arn:aws:dms:us-east-1:123456789012:endpoint:ZW5UAN6P4E77EC7YWHK4RZZ3BE",
                "EndpointIdentifier": "testsrc1",
                "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:6UTDJGBOUS3VI3SUWA66XFJCJQ"
            }
        ]
    }

For more information, see `Creating Source and Target Endpoints <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.Creating.html>`__ in the *AWS Database Migration Service User Guide*.
