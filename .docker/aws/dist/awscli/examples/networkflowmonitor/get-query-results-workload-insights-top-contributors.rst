**To retrieve the top contributors on workload insights**

The following ``get-query-results-workload-insights-top-contributors`` example returns the data for the specified query. ::

    aws networkflowmonitor get-query-results-workload-insights-top-contributors \
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf \
        --query-id 1fc423d3-b144-37a6-80e6-e2c7d26eea0c

Output::

    {
        "topContributors": [
            {
                "accountId": "123456789012",
                "localSubnetId": "subnet-0a5b30fb95dca2c14",
                "localAz": "use1-az6",
                "localVpcId": "vpc-03ea55eeda25adbb0",
                "localRegion": "us-east-1",
                "remoteIdentifier": "",
                "value": 908443,
                "localSubnetArn": "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-0a5b30fb95dca2c14",
                "localVpcArn": "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-03ea55eeda25adbb0"
            }
        ]
    }

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.