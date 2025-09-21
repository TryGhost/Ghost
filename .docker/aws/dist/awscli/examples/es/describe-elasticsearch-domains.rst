**To get details for one or more domains**

The following ``describe-elasticsearch-domains`` example provides configuration details for one or more domains. ::

    aws es describe-elasticsearch-domains \
        --domain-names cli-example-1 cli-example-2

Output::

    {
        "DomainStatusList": [{
                "DomainId": "123456789012/cli-example-1",
                "DomainName": "cli-example-1",
                "ARN": "arn:aws:es:us-east-1:123456789012:domain/cli-example-1",
                "Created": true,
                "Deleted": false,
                "Endpoint": "search-cli-example-1-1a2a3a4a5a6a7a8a9a0a.us-east-1.es.amazonaws.com",
                "Processing": false,
                "UpgradeProcessing": false,
                "ElasticsearchVersion": "7.4",
                "ElasticsearchClusterConfig": {
                    "InstanceType": "c5.large.elasticsearch",
                    "InstanceCount": 1,
                     "DedicatedMasterEnabled": true,
                    "ZoneAwarenessEnabled": false,
                    "DedicatedMasterType": "c5.large.elasticsearch",
                    "DedicatedMasterCount": 3,
                    "WarmEnabled": true,
                    "WarmType": "ultrawarm1.medium.elasticsearch",
                    "WarmCount": 2
                },
                "EBSOptions": {
                    "EBSEnabled": true,
                    "VolumeType": "gp2",
                    "VolumeSize": 10
                },
                "AccessPolicies": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"*\"},\"Action\":\"es:*\",\"Resource\":\"arn:aws:es:us-east-1:123456789012:domain/cli-example-1/*\"}]}",
                "SnapshotOptions": {
                    "AutomatedSnapshotStartHour": 0
                },
                "CognitoOptions": {
                    "Enabled": false
                },
                "EncryptionAtRestOptions": {
                    "Enabled": true,
                    "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/1a2a3a4a-1a2a-1a2a-1a2a-1a2a3a4a5a6a"
                },
                "NodeToNodeEncryptionOptions": {
                    "Enabled": true
                },
                "AdvancedOptions": {
                    "rest.action.multi.allow_explicit_index": "true"
                },
                "ServiceSoftwareOptions": {
                    "CurrentVersion": "R20200522",
                    "NewVersion": "",
                    "UpdateAvailable": false,
                    "Cancellable": false,
                    "UpdateStatus": "COMPLETED",
                    "Description": "There is no software update available for this domain.",
                    "AutomatedUpdateDate": 0.0
                },
                "DomainEndpointOptions": {
                    "EnforceHTTPS": true,
                    "TLSSecurityPolicy": "Policy-Min-TLS-1-0-2019-07"
                },
                "AdvancedSecurityOptions": {
                    "Enabled": true,
                    "InternalUserDatabaseEnabled": true
                }
            },
            {
                "DomainId": "123456789012/cli-example-2",
                "DomainName": "cli-example-2",
                "ARN": "arn:aws:es:us-east-1:123456789012:domain/cli-example-2",
                "Created": true,
                "Deleted": false,
                "Processing": true,
                "UpgradeProcessing": false,
                "ElasticsearchVersion": "7.4",
                "ElasticsearchClusterConfig": {
                    "InstanceType": "r5.large.elasticsearch",
                    "InstanceCount": 1,
                    "DedicatedMasterEnabled": false,
                    "ZoneAwarenessEnabled": false,
                    "WarmEnabled": false
                },
                "EBSOptions": {
                    "EBSEnabled": true,
                    "VolumeType": "gp2",
                    "VolumeSize": 10
                },
                "AccessPolicies": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Deny\",\"Principal\":{\"AWS\":\"*\"},\"Action\":\"es:*\",\"Resource\":\"arn:aws:es:us-east-1:123456789012:domain/cli-example-2/*\"}]}",
                "SnapshotOptions": {
                    "AutomatedSnapshotStartHour": 0
                },
                "CognitoOptions": {
                    "Enabled": false
                },
                "EncryptionAtRestOptions": {
                    "Enabled": false
                },
                "NodeToNodeEncryptionOptions": {
                    "Enabled": false
                },
                "AdvancedOptions": {
                    "rest.action.multi.allow_explicit_index": "true"
                },
                "ServiceSoftwareOptions": {
                    "CurrentVersion": "",
                    "NewVersion": "",
                    "UpdateAvailable": false,
                    "Cancellable": false,
                    "UpdateStatus": "COMPLETED",
                    "Description": "There is no software update available for this domain.",
                    "AutomatedUpdateDate": 0.0
                },
                "DomainEndpointOptions": {
                    "EnforceHTTPS": false,
                    "TLSSecurityPolicy": "Policy-Min-TLS-1-0-2019-07"
                },
                "AdvancedSecurityOptions": {
                    "Enabled": false,
                    "InternalUserDatabaseEnabled": false
                }
            }
        ]
    }

For more information, see `Creating and Managing Amazon Elasticsearch Service Domains <https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html>`__ in the *Amazon Elasticsearch Service Developer Guide*.
