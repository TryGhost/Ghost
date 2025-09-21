**To create an Amazon MSK cluster**

The following ``create-cluster`` example creates an MSK cluster named ``MessagingCluster`` with three broker nodes. A JSON file named ``brokernodegroupinfo.json`` specifies the three subnets over which you want Amazon MSK to distribute the broker nodes. This example doesn't specify the monitoring level, so the cluster gets the ``DEFAULT`` level.  ::

    aws kafka create-cluster \
        --cluster-name "MessagingCluster" \
        --broker-node-group-info file://brokernodegroupinfo.json \
        --kafka-version "2.2.1" \
        --number-of-broker-nodes 3

Contents of ``brokernodegroupinfo.json``::

    {
        "InstanceType": "kafka.m5.xlarge",
        "BrokerAZDistribution": "DEFAULT",
        "ClientSubnets": [
            "subnet-0123456789111abcd",
            "subnet-0123456789222abcd",
            "subnet-0123456789333abcd"
        ]
    }

Output::

    {
        "ClusterArn": "arn:aws:kafka:us-west-2:123456789012:cluster/MessagingCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2",
        "ClusterName": "MessagingCluster",
        "State": "CREATING"
    }

For more information, see `Create an Amazon MSK Cluster <https://docs.aws.amazon.com/msk/latest/developerguide/msk-create-cluster.html>`__ in the *Amazon Managed Streaming for Apache Kafka*.
