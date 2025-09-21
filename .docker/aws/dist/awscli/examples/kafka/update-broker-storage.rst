**To update the EBS storage for brokers**

The following ``update-broker-storage`` example updates the amount of EBS storage for all the brokers in the cluster. Amazon MSK sets the target storage amount for each broker to the amount specified in the example. You can get the current version of the cluster by describing the cluster or by listing all of the clusters. ::


    aws kafka update-broker-storage \
        --cluster-arn "arn:aws:kafka:us-west-2:123456789012:cluster/MessagingCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2" \
        --current-version "K21V3IB1VIZYYH" \
        --target-broker-ebs-volume-info "KafkaBrokerNodeId=ALL,VolumeSizeGB=1100"

The output returns an ARN for this ``update-broker-storage`` operation. To determine if this operation is complete, use the ``describe-cluster-operation`` command with this ARN as input. ::

    {
        "ClusterArn": "arn:aws:kafka:us-west-2:123456789012:cluster/MessagingCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2",
        "ClusterOperationArn": "arn:aws:kafka:us-west-2:123456789012:cluster-operation/V123450123/a1b2c3d4-1234-abcd-cdef-22222EXAMPLE-2/a1b2c3d4-abcd-1234-bcde-33333EXAMPLE"
    }

For more information, see `Update the EBS Storage for Brokers <https://docs.aws.amazon.com/msk/latest/developerguide/msk-update-storage.html>`__ in the *Amazon Managed Streaming for Apache Kafka Developer Guide*.
