**To create a CloudFormation template to automate the integration of VPC flow logs with Amazon Athena**

The following ``get-flow-logs-integration-template`` examples create a CloudFormation template to automate the integration of VPC flow logs with Amazon Athena.

Linux::

    aws ec2 get-flow-logs-integration-template \
        --flow-log-id fl-1234567890abcdef0 \
        --config-delivery-s3-destination-arn arn:aws:s3:::amzn-s3-demo-bucket \
        --integrate-services AthenaIntegrations='[{IntegrationResultS3DestinationArn=arn:aws:s3:::amzn-s3-demo-bucket,PartitionLoadFrequency=none,PartitionStartDate=2021-07-21T00:40:00,PartitionEndDate=2021-07-21T00:42:00},{IntegrationResultS3DestinationArn=arn:aws:s3:::amzn-s3-demo-bucket,PartitionLoadFrequency=none,PartitionStartDate=2021-07-21T00:40:00,PartitionEndDate=2021-07-21T00:42:00}]'

Windows::

    aws ec2 get-flow-logs-integration-template ^
        --flow-log-id fl-1234567890abcdef0 ^
        --config-delivery-s3-destination-arn arn:aws:s3:::amzn-s3-demo-bucket ^
        --integrate-services AthenaIntegrations=[{IntegrationResultS3DestinationArn=arn:aws:s3:::amzn-s3-demo-bucket,PartitionLoadFrequency=none,PartitionStartDate=2021-07-21T00:40:00,PartitionEndDate=2021-07-21T00:42:00},{IntegrationResultS3DestinationArn=arn:aws:s3:::amzn-s3-demo-bucket,PartitionLoadFrequency=none,PartitionStartDate=2021-07-21T00:40:00,PartitionEndDate=2021-07-21T00:42:00}]

Output::

    {
        "Result": "https://amzn-s3-demo-bucket.s3.us-east-2.amazonaws.com/VPCFlowLogsIntegrationTemplate_fl-1234567890abcdef0_Wed%20Jul%2021%2000%3A57%3A56%20UTC%202021.yml"
    }

For information on using CloudFormation templates, see `Working with AWS CloudFormation templates  <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-guide.html>`__ in the *AWS CloudFormation User Guide*.

For information on using Amazon Athena and flow logs, see `Query flow logs using Amazon Athena  <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-athena.html>`__ in the *Amazon Virtual Private Cloud User Guide*.