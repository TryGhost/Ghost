**Example 1: To describe all of your flow logs**

The following ``describe-flow-logs`` example displays details for all of your flow logs. ::

    aws ec2 describe-flow-logs

Output::

    {
        "FlowLogs": [
            {
                "CreationTime": "2018-02-21T13:22:12.644Z",
                "DeliverLogsPermissionArn": "arn:aws:iam::123456789012:role/flow-logs-role",
                "DeliverLogsStatus": "SUCCESS",
                "FlowLogId": "fl-aabbccdd112233445",
                "MaxAggregationInterval": 600,
                "FlowLogStatus": "ACTIVE",
                "LogGroupName": "FlowLogGroup",
                "ResourceId": "subnet-12345678901234567",
                "TrafficType": "ALL",
                "LogDestinationType": "cloud-watch-logs",
                "LogFormat": "${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}"
            },
            {
                "CreationTime": "2020-02-04T15:22:29.986Z",
                "DeliverLogsStatus": "SUCCESS",
                "FlowLogId": "fl-01234567890123456",
                "MaxAggregationInterval": 60,
                "FlowLogStatus": "ACTIVE",
                "ResourceId": "vpc-00112233445566778",
                "TrafficType": "ACCEPT",
                "LogDestinationType": "s3",
                "LogDestination": "arn:aws:s3:::my-flow-log-bucket/custom",
                "LogFormat": "${version} ${vpc-id} ${subnet-id} ${instance-id} ${interface-id} ${account-id} ${type} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${pkt-srcaddr} ${pkt-dstaddr} ${protocol} ${bytes} ${packets} ${start} ${end} ${action} ${tcp-flags} ${log-status}"
            }
        ]
    }

**Example 2: To describe a subset of your flow logs**

The following ``describe-flow-logs`` example uses a filter to display details for only those flow logs that are in the specified log group in Amazon CloudWatch Logs. ::

    aws ec2 describe-flow-logs \
        --filter "Name=log-group-name,Values=MyFlowLogs"
