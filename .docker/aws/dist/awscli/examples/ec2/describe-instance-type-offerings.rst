**Example 1: To list the instance types offered in a Region**

The following ``describe-instance-type-offerings`` example lists the instance types offered in the Region configured as the default Region for the AWS CLI. ::

    aws ec2 describe-instance-type-offerings

To list the instance types offered in a different Region, specify the Region using the ``--region`` parameter. ::

    aws ec2 describe-instance-type-offerings \
        --region us-east-2

Output::

  {
    "InstanceTypeOfferings": [
        {
            "InstanceType": "m5.2xlarge",
            "LocationType": "region",
            "Location": "us-east-2"
        },
        {
            "InstanceType": "t3.micro",
            "LocationType": "region",
            "Location": "us-east-2"
        },
        ...
    ]
  }

**Example 2: To list the instance types offered in an Availability Zone**

The following ``describe-instance-type-offerings`` example lists the instance types offered in the specified Availability Zone. The Availability Zone must be in the specified Region. ::

  aws ec2 describe-instance-type-offerings \
      --location-type availability-zone \
      --filters Name=location,Values=us-east-2a \
      --region us-east-2

**Example 3: To check whether an instance type is supported**

The following ``describe-instance-type-offerings`` command indicates whether the ``c5.xlarge`` instance type is supported in the specified Region. ::

  aws ec2 describe-instance-type-offerings \
      --filters Name=instance-type,Values=c5.xlarge \
      --region us-east-2

The following ``describe-instance-type-offerings`` example lists all C5 instance types that are supported in the specified Region. ::

    aws ec2 describe-instance-type-offerings \
        --filters Name=instance-type,Values=c5* \
        --query "InstanceTypeOfferings[].InstanceType" \
        --region us-east-2

Output::

    [
        "c5d.12xlarge",
        "c5d.9xlarge",
        "c5n.xlarge",
        "c5.xlarge",
        "c5d.metal",
        "c5n.metal",
        "c5.large",
        "c5d.2xlarge",
        "c5n.4xlarge",
        "c5.2xlarge",
        "c5n.large",
        "c5n.9xlarge",
        "c5d.large",
        "c5.18xlarge",
        "c5d.18xlarge",
        "c5.12xlarge",
        "c5n.18xlarge",
        "c5.metal",
        "c5d.4xlarge",
        "c5.24xlarge",
        "c5d.xlarge",
        "c5n.2xlarge",
        "c5d.24xlarge",
        "c5.9xlarge",
        "c5.4xlarge"
    ]
