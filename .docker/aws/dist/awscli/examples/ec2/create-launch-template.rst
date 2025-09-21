**Example 1: To create a launch template**

The following ``create-launch-template`` example creates a launch template that specifies the subnet in which to launch the instance , assigns a public IP address and an IPv6 address to the instance, and creates a tag for the instance. ::

    aws ec2 create-launch-template \
        --launch-template-name TemplateForWebServer \
        --version-description WebVersion1 \
        --launch-template-data '{"NetworkInterfaces":[{"AssociatePublicIpAddress":true,"DeviceIndex":0,"Ipv6AddressCount":1,"SubnetId":"subnet-7b16de0c"}],"ImageId":"ami-8c1be5f6","InstanceType":"t2.small","TagSpecifications":[{"ResourceType":"instance","Tags":[{"Key":"purpose","Value":"webserver"}]}]}'

Output::

    {
        "LaunchTemplate": {
            "LatestVersionNumber": 1, 
            "LaunchTemplateId": "lt-01238c059e3466abc", 
            "LaunchTemplateName": "TemplateForWebServer", 
            "DefaultVersionNumber": 1, 
            "CreatedBy": "arn:aws:iam::123456789012:user/Bob", 
            "CreateTime": "2019-01-27T09:13:24.000Z"
        }
    }

For more information, see `Launching an Instance from a Launch Template`_ in the *Amazon Elastic Compute Cloud User Guide*.
For information about quoting JSON-formatted parameters, see `Quoting Strings`_ in the *AWS Command Line Interface User Guide*.

**Example 2: To create a launch template for Amazon EC2 Auto Scaling**

The following ``create-launch-template`` example creates a launch template with multiple tags and a block device mapping to specify an additional EBS volume when an instance launches. Specify a value for ``Groups`` that corresponds to security groups for the VPC that your Auto Scaling group will launch instances into. Specify the VPC and subnets as properties of the Auto Scaling group. ::

    aws ec2 create-launch-template \
        --launch-template-name TemplateForAutoScaling \
        --version-description AutoScalingVersion1 \
        --launch-template-data '{"NetworkInterfaces":[{"DeviceIndex":0,"AssociatePublicIpAddress":true,"Groups":["sg-7c227019,sg-903004f8"],"DeleteOnTermination":true}],"ImageId":"ami-b42209de","InstanceType":"m4.large","TagSpecifications":[{"ResourceType":"instance","Tags":[{"Key":"environment","Value":"production"},{"Key":"purpose","Value":"webserver"}]},{"ResourceType":"volume","Tags":[{"Key":"environment","Value":"production"},{"Key":"cost-center","Value":"cc123"}]}],"BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100}}]}' --region us-east-1 

Output::

  {
      "LaunchTemplate": {
          "LatestVersionNumber": 1,
          "LaunchTemplateId": "lt-0123c79c33a54e0abc",
          "LaunchTemplateName": "TemplateForAutoScaling",
          "DefaultVersionNumber": 1,
          "CreatedBy": "arn:aws:iam::123456789012:user/Bob",
          "CreateTime": "2019-04-30T18:16:06.000Z"
      }
  }

For more information, see `Creating a Launch Template for an Auto Scaling Group`_ in the *Amazon EC2 Auto Scaling User Guide*.
For information about quoting JSON-formatted parameters, see `Quoting Strings`_ in the *AWS Command Line Interface User Guide*.

**Example 3: To create a launch template that specifies encryption of EBS volumes**

The following ``create-launch-template`` example creates a launch template that includes encrypted EBS volumes created from an unencrypted snapshot. It also tags the volumes during creation. If encryption by default is disabled, you must specify the ``"Encrypted"`` option as shown in the following example. If you use the ``"KmsKeyId"`` option to specify a customer managed CMK, you also must specify the ``"Encrypted"`` option even if encryption by default is enabled. ::

  aws ec2 create-launch-template \
    --launch-template-name TemplateForEncryption \
    --launch-template-data file://config.json

Contents of ``config.json``::

    {
        "BlockDeviceMappings":[
            {
                "DeviceName":"/dev/sda1",
                "Ebs":{
                    "VolumeType":"gp2",
                    "DeleteOnTermination":true,
                    "SnapshotId":"snap-066877671789bd71b",
                    "Encrypted":true,
                    "KmsKeyId":"arn:aws:kms:us-east-1:012345678910:key/abcd1234-a123-456a-a12b-a123b4cd56ef"
                }
            }
        ],
        "ImageId":"ami-00068cd7555f543d5",
        "InstanceType":"c5.large",
        "TagSpecifications":[
            {
                "ResourceType":"volume",
                "Tags":[
                    {
                        "Key":"encrypted",
                        "Value":"yes"
                    }
                ]
            }
        ]
    }

Output::

    {
        "LaunchTemplate": {
            "LatestVersionNumber": 1,
            "LaunchTemplateId": "lt-0d5bd51bcf8530abc",
            "LaunchTemplateName": "TemplateForEncryption",
            "DefaultVersionNumber": 1,
            "CreatedBy": "arn:aws:iam::123456789012:user/Bob",
            "CreateTime": "2020-01-07T19:08:36.000Z"
        }
    }

For more information, see `Restoring an Amazon EBS Volume from a Snapshot`_ and `Encryption by Default`_ in the *Amazon Elastic Compute Cloud User Guide*.

.. _`Launching an Instance from a Launch Template`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html
.. _`Creating a Launch Template for an Auto Scaling Group`: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
.. _`Quoting Strings`: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters.html#quoting-strings
.. _`Restoring an Amazon EBS Volume from a Snapshot`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-restoring-volume.html
.. _`Encryption by Default`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html#encryption-by-default
