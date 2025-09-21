**Example 1: To get the Average Total IOPS for the specified EC2 using math expression**

The following ``get-metric-data`` example retrieves CloudWatch metric values for the EC2 instance with InstanceID ``i-abcdef`` using metric math exprssion that combines ``EBSReadOps`` and ``EBSWriteOps`` metrics. ::

    aws cloudwatch get-metric-data \
        --metric-data-queries file://file.json \
        --start-time 2024-09-29T22:10:00Z \
        --end-time 2024-09-29T22:15:00Z

Contents of ``file.json``::

    [
        {
            "Id": "m3",
            "Expression": "(m1+m2)/300",
            "Label": "Avg Total IOPS"
        },
        {
            "Id": "m1",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/EC2",
                    "MetricName": "EBSReadOps",
                    "Dimensions": [
                        {
                            "Name": "InstanceId",
                            "Value": "i-abcdef"
                        }
                    ]
                },
                "Period": 300,
                "Stat": "Sum",
                "Unit": "Count"
            },
            "ReturnData": false
        },
        {
            "Id": "m2",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/EC2",
                    "MetricName": "EBSWriteOps",
                    "Dimensions": [
                        {
                            "Name": "InstanceId",
                            "Value": "i-abcdef"
                        }
                    ]
                },
                "Period": 300,
                "Stat": "Sum",
                "Unit": "Count"
            },
            "ReturnData": false
        }
    ]

Output::

    {
        "MetricDataResults": [
            {
                "Id": "m3",
                "Label": "Avg Total IOPS",
                "Timestamps": [
                    "2024-09-29T22:10:00+00:00"
                ],
                "Values": [
                    96.85
                ],
                "StatusCode": "Complete"
            }
        ],
        "Messages": []
    }

**Example 2: To monitor the estimated AWS charges using CloudWatch billing metrics**

The following ``get-metric-data`` example retrieves ``EstimatedCharges`` CloudWatch metric from AWS/Billing namespace. ::

    aws cloudwatch get-metric-data \
        --metric-data-queries '[{"Id":"m1","MetricStat":{"Metric":{"Namespace":"AWS/Billing","MetricName":"EstimatedCharges","Dimensions":[{"Name":"Currency","Value":"USD"}]},"Period":21600,"Stat":"Maximum"}}]' \
        --start-time 2024-09-26T12:00:00Z \
        --end-time 2024-09-26T18:00:00Z \
        --region us-east-1

Output::

    {
        "MetricDataResults": [
            {
                "Id": "m1",
                "Label": "EstimatedCharges",
                "Timestamps": [
                    "2024-09-26T12:00:00+00:00"
                ],
                "Values": [
                    542.38
                ],
                "StatusCode": "Complete"
            }
        ],
        "Messages": []
    }
    
For more information, see `Using math expressions with CloudWatch metrics <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html>`__ in the *Amazon CloudWatch User Guide*.