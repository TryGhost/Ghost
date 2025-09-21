**To update the configuration of an Amazon MSK cluster**

The following ``update-cluster-configuration`` example updates the configuration of the specified existing MSK cluster. It uses a custom MSK configuration. ::


    aws kafka update-cluster-configuration \
        --cluster-arn "arn:aws:kafka:us-west-2:123456789012:cluster/MessagingCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2" \
        --configuration-info file://configuration-info.json \
        --current-version "K21V3IB1VIZYYH"

Contents of ``configuration-info.json``::

    {
        "Arn": "arn:aws:kafka:us-west-2:123456789012:configuration/CustomConfiguration/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2",
        "Revision": 1
    }

The output returns an ARN for this ``update-cluster-configuration`` operation. To determine if this operation is complete, use the ``describe-cluster-operation`` command with this ARN as input. ::

    {
        "ClusterArn": "arn:aws:kafka:us-west-2:123456789012:cluster/MessagingCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2",
        "ClusterOperationArn": "arn:aws:kafka:us-west-2:123456789012:cluster-operation/V123450123/a1b2c3d4-1234-abcd-cdef-22222EXAMPLE-2/a1b2c3d4-abcd-1234-bcde-33333EXAMPLE"
    }

For more information, see `Update the Configuration of an Amazon MSK Cluster <https://docs.aws.amazon.com/msk/latest/developerguide/msk-update-cluster-cofig.html>`__ in the *Amazon Managed Streaming for Apache Kafka Developer Guide*.
