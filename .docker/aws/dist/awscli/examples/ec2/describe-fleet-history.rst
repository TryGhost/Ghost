**To describe EC2 Fleet history**

The following ``describe-fleet-history`` example returns the history for the specified EC2 Fleet starting at the specified time. The output is for an EC2 Fleet with two running instances. ::

    aws ec2 describe-fleet-history \
        --fleet-id fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE \
        --start-time 2020-09-01T00:00:00Z

Output::

    {
        "HistoryRecords": [
            {
                "EventInformation": {
                    "EventSubType": "submitted"
                },
                "EventType": "fleetRequestChange",
                "Timestamp": "2020-09-01T18:26:05.000Z"
            },
            {
                "EventInformation": {
                    "EventSubType": "active"
                },
                "EventType": "fleetRequestChange",
                "Timestamp": "2020-09-01T18:26:15.000Z"
            },
            {
                "EventInformation": {
                    "EventDescription": "t2.small, ami-07c8bc5c1ce9598c3, ...",
                    "EventSubType": "progress"
                },
                "EventType": "fleetRequestChange",
                "Timestamp": "2020-09-01T18:26:17.000Z"
            },
            {
                "EventInformation": {
                    "EventDescription": "{\"instanceType\":\"t2.small\", ...}",
                    "EventSubType": "launched",
                    "InstanceId": "i-083a1c446e66085d2"
                },
                "EventType": "instanceChange",
                "Timestamp": "2020-09-01T18:26:17.000Z"
            },
            {
                "EventInformation": {
                    "EventDescription": "{\"instanceType\":\"t2.small\", ...}",
                    "EventSubType": "launched",
                    "InstanceId": "i-090db02406cc3c2d6"
                },
                "EventType": "instanceChange",
                "Timestamp": "2020-09-01T18:26:17.000Z"
            }
        ],
        "LastEvaluatedTime": "2020-09-01T19:10:19.000Z",
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE",
        "StartTime": "2020-08-31T23:53:20.000Z"
    }

For more information, see `Managing an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.