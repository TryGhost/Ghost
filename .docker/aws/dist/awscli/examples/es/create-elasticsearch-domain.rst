**To create an Amazon Elasticsearch Service domain**

The following ``create-elasticsearch-domain`` command creates a new Amazon Elasticsearch Service domain within a VPC and restricts access to a single user. Amazon ES infers the VPC ID from the specified subnet and security group IDs. ::

    aws es create-elasticsearch-domain \
        --domain-name vpc-cli-example \
        --elasticsearch-version 6.2 \
        --elasticsearch-cluster-config InstanceType=m4.large.elasticsearch,InstanceCount=1 \
        --ebs-options EBSEnabled=true,VolumeType=standard,VolumeSize=10 \
        --access-policies '{"Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": {"AWS": "arn:aws:iam::123456789012:root" }, "Action":"es:*", "Resource": "arn:aws:es:us-west-1:123456789012:domain/vpc-cli-example/*" } ] }' \
        --vpc-options SubnetIds=subnet-1a2a3a4a,SecurityGroupIds=sg-2a3a4a5a

Output::

    {
        "DomainStatus": {
            "ElasticsearchClusterConfig": {
                "DedicatedMasterEnabled": false,
                "InstanceCount": 1,
                "ZoneAwarenessEnabled": false,
                "InstanceType": "m4.large.elasticsearch"
            },
            "DomainId": "123456789012/vpc-cli-example",
            "CognitoOptions": {
                "Enabled": false
            },
            "VPCOptions": {
                "SubnetIds": [
                    "subnet-1a2a3a4a"
                ],
                "VPCId": "vpc-3a4a5a6a",
                "SecurityGroupIds": [
                    "sg-2a3a4a5a"
                ],
                "AvailabilityZones": [
                    "us-west-1c"
                ]
            },
            "Created": true,
            "Deleted": false,
            "EBSOptions": {
                "VolumeSize": 10,
                "VolumeType": "standard",
                "EBSEnabled": true
            },
            "Processing": true,
            "DomainName": "vpc-cli-example",
            "SnapshotOptions": {
                "AutomatedSnapshotStartHour": 0
            },
            "ElasticsearchVersion": "6.2",
            "AccessPolicies": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:root\"},\"Action\":\"es:*\",\"Resource\":\"arn:aws:es:us-west-1:123456789012:domain/vpc-cli-example/*\"}]}",
            "AdvancedOptions": {
                "rest.action.multi.allow_explicit_index": "true"
            },
            "EncryptionAtRestOptions": {
                "Enabled": false
            },
            "ARN": "arn:aws:es:us-west-1:123456789012:domain/vpc-cli-example"
        }
    }
 
For more information, see `Creating and Managing Amazon Elasticsearch Service Domains <https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html>`__ in the *Amazon Elasticsearch Service Developer Guide*.
