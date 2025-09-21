**To list the available clusters**

The following ``list-clusters`` example lists the Amazon MSK clusters in your AWS account. ::

    aws kafka list-clusters

Output::

    {
        "ClusterInfoList": [
            {
                "BrokerNodeGroupInfo": {
                    "BrokerAZDistribution": "DEFAULT",
                    "ClientSubnets": [
                        "subnet-cbfff283",
                        "subnet-6746046b"
                    ],
                    "InstanceType": "kafka.m5.large",
                    "SecurityGroups": [
                        "sg-f839b688"
                    ],
                    "StorageInfo": {
                        "EbsStorageInfo": {
                            "VolumeSize": 100
                        }
                    }
                },
                "ClusterArn": "arn:aws:kafka:us-east-1:123456789012:cluster/demo-cluster-1/6357e0b2-0e6a-4b86-a0b4-70df934c2e31-5",
                "ClusterName": "demo-cluster-1",
                "CreationTime": "2020-07-09T02:31:36.223000+00:00",
                "CurrentBrokerSoftwareInfo": {
                    "KafkaVersion": "2.2.1"
                },
                "CurrentVersion": "K3AEGXETSR30VB",
                "EncryptionInfo": {
                    "EncryptionAtRest": {
                        "DataVolumeKMSKeyId": "arn:aws:kms:us-east-1:123456789012:key/a7ca56d5-0768-4b64-a670-339a9fbef81c"
                    },
                    "EncryptionInTransit": {
                        "ClientBroker": "TLS_PLAINTEXT",
                        "InCluster": true
                    }
                },
                "EnhancedMonitoring": "DEFAULT",
                "OpenMonitoring": {
                    "Prometheus": {
                        "JmxExporter": {
                            "EnabledInBroker": false
                        },
                        "NodeExporter": {
                            "EnabledInBroker": false
                        }
                    }
                },
                "NumberOfBrokerNodes": 2,
                "State": "ACTIVE",
                "Tags": {},
                "ZookeeperConnectString": "z-2.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:2181,z-1.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:2181,z-3.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:2181"
            }
        ]
    }

For more information, see `Listing Amazon MSK Clusters <https://docs.aws.amazon.com/msk/latest/developerguide/msk-list-clusters.html>`__ in the *Amazon Managed Streaming for Apache Kafka Developer Guide*.
