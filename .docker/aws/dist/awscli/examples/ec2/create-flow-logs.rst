**Example 1: To create a flow log**

The following ``create-flow-logs`` example creates a flow log that captures all rejected traffic for the specified network interface. The flow logs are delivered to a log group in CloudWatch Logs using the permissions in the specified IAM role. ::

    aws ec2 create-flow-logs \
        --resource-type NetworkInterface \
        --resource-ids eni-11223344556677889 \
        --traffic-type REJECT \
        --log-group-name my-flow-logs \
        --deliver-logs-permission-arn arn:aws:iam::123456789101:role/publishFlowLogs

Output::

    {
        "ClientToken": "so0eNA2uSHUNlHI0S2cJ305GuIX1CezaRdGtexample",
        "FlowLogIds": [
            "fl-12345678901234567"
        ],
        "Unsuccessful": []
    }

For more information, see `VPC Flow Logs <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html>`__ in the *Amazon VPC User Guide*.

**Example 2: To create a flow log with a custom format**

The following ``create-flow-logs`` example creates a flow log that captures all traffic for the specified VPC and delivers the flow logs to an Amazon S3 bucket. The ``--log-format`` parameter specifies a custom format for the flow log records. To run this command on Windows, change the single quotes (') to double quotes ("). ::

    aws ec2 create-flow-logs \
        --resource-type VPC \
        --resource-ids vpc-00112233344556677 \
        --traffic-type ALL \
        --log-destination-type s3 \
        --log-destination arn:aws:s3:::flow-log-bucket/my-custom-flow-logs/ \
        --log-format '${version} ${vpc-id} ${subnet-id} ${instance-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${tcp-flags} ${type} ${pkt-srcaddr} ${pkt-dstaddr}'

For more information, see `VPC Flow Logs <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html>`__ in the *Amazon VPC User Guide*.

**Example 3: To create a flow log with a one-minute maximum aggregation interval**

The following ``create-flow-logs`` example creates a flow log that captures all traffic for the specified VPC and delivers the flow logs to an Amazon S3 bucket. The ``--max-aggregation-interval`` parameter specifies a maximum aggregation interval of 60 seconds (1 minute). ::

    aws ec2 create-flow-logs \
        --resource-type VPC \
        --resource-ids vpc-00112233344556677 \
        --traffic-type ALL \
        --log-destination-type s3 \
        --log-destination arn:aws:s3:::flow-log-bucket/my-custom-flow-logs/ \
        --max-aggregation-interval 60

For more information, see `VPC Flow Logs <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html>`__ in the *Amazon VPC User Guide*.