**To get domain configuration details**

The following ``describe-elasticsearch-domain-config`` example provides configuration details for a given domain, along with status information for each individual domain component. ::

    aws es describe-elasticsearch-domain-config \
        --domain-name cli-example

Output::

    {
        "DomainConfig": {
            "ElasticsearchVersion": {
                "Options": "7.4",
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "ElasticsearchClusterConfig": {
                "Options": {
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
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "EBSOptions": {
                "Options": {
                    "EBSEnabled": true,
                    "VolumeType": "gp2",
                    "VolumeSize": 10
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "AccessPolicies": {
                "Options": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"*\"},\"Action\":\"es:*\",\"Resource\":\"arn:aws:es:us-east-1:123456789012:domain/cli-example/*\"}]}",
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "SnapshotOptions": {
                "Options": {
                    "AutomatedSnapshotStartHour": 0
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "VPCOptions": {
                "Options": {},
                "Status": {
                    "CreationDate": 1591210426.162,
                    "UpdateDate": 1591210426.162,
                    "UpdateVersion": 18,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "CognitoOptions": {
                "Options": {
                    "Enabled": false
                },
                "Status": {
                    "CreationDate": 1591210426.163,
                    "UpdateDate": 1591210426.163,
                    "UpdateVersion": 18,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "EncryptionAtRestOptions": {
                "Options": {
                    "Enabled": true,
                    "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/1a2a3a4a-1a2a-1a2a-1a2a-1a2a3a4a5a6a"
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "NodeToNodeEncryptionOptions": {
                "Options": {
                    "Enabled": true
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "AdvancedOptions": {
                "Options": {
                    "rest.action.multi.allow_explicit_index": "true"
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "LogPublishingOptions": {
                "Options": {},
                "Status": {
                    "CreationDate": 1591210426.164,
                    "UpdateDate": 1591210426.164,
                    "UpdateVersion": 18,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "DomainEndpointOptions": {
                "Options": {
                    "EnforceHTTPS": true,
                    "TLSSecurityPolicy": "Policy-Min-TLS-1-0-2019-07"
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589395827.325,
                    "UpdateVersion": 8,
                    "State": "Active",
                    "PendingDeletion": false
                }
            },
            "AdvancedSecurityOptions": {
                "Options": {
                    "Enabled": true,
                    "InternalUserDatabaseEnabled": true
                },
                "Status": {
                    "CreationDate": 1589395034.946,
                    "UpdateDate": 1589827485.577,
                    "UpdateVersion": 14,
                    "State": "Active",
                    "PendingDeletion": false
                }
            }
        }
    }

For more information, see `Creating and Managing Amazon Elasticsearch Service Domains <https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html>`__ in the *Amazon Elasticsearch Service Developer Guide*.
