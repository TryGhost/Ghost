**Example 1: To record all supported resources**

The following command creates a configuration recorder that tracks changes to all supported resource types, including global resource types::

    aws configservice put-configuration-recorder \
        --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/config-role \
        --recording-group allSupported=true,includeGlobalResourceTypes=true

If the command succeeds, AWS Config returns no output. To verify the settings of your configuration recorder, run the `describe-configuration-recorders`__ command.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-configuration-recorders.html

**Example 2: To record specific types of resources**

The following command creates a configuration recorder that tracks changes to only those types of resources that are specified in the JSON file for the `--recording-group` option::

    aws configservice put-configuration-recorder \
        --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/config-role \
        --recording-group file://recordingGroup.json

`recordingGroup.json` is a JSON file that specifies the types of resources that AWS Config will record::

    {
        "allSupported": false,
        "includeGlobalResourceTypes": false,
        "resourceTypes": [
            "AWS::EC2::EIP",
            "AWS::EC2::Instance",
            "AWS::EC2::NetworkAcl",
            "AWS::EC2::SecurityGroup",
            "AWS::CloudTrail::Trail",
            "AWS::EC2::Volume",
            "AWS::EC2::VPC",
            "AWS::IAM::User",
            "AWS::IAM::Policy"
        ]
    }

Before you can specify resource types for the `resourceTypes` key, you must set the `allSupported` and `includeGlobalResourceTypes` options to false or omit them.

If the command succeeds, AWS Config returns no output. To verify the settings of your configuration recorder, run the `describe-configuration-recorders`__ command.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-configuration-recorders.html

**Example 3: To select all supported resources excluding specific types of resources**

The following command creates a configuration recorder that tracks changes to all current and future supported resource types excluding those types of resources that are specified in the JSON file for the `--recording-group` option::

    aws configservice put-configuration-recorder \
        --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/config-role \
        --recording-group file://recordingGroup.json

`recordingGroup.json` is a JSON file that specifies the types of resources that AWS Config will record::

    {
        "allSupported": false,
        "exclusionByResourceTypes": { 
            "resourceTypes": [
            "AWS::Redshift::ClusterSnapshot",
            "AWS::RDS::DBClusterSnapshot",
            "AWS::CloudFront::StreamingDistribution"
        ]
        },
            "includeGlobalResourceTypes": false,
            "recordingStrategy": {
            "useOnly": "EXCLUSION_BY_RESOURCE_TYPES" 
        },
    }

Before you can specify resource types to excluding from recording: 1) You must set the allSupported and includeGlobalResourceTypes options to false or omit them, and 2) You must set the useOnly field of RecordingStrategy to EXCLUSION_BY_RESOURCE_TYPES.

If the command succeeds, AWS Config returns no output. To verify the settings of your configuration recorder, run the `describe-configuration-recorders`__ command.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-configuration-recorders.html