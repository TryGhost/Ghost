**To create a custom Amazon MSK configuration**

The following ``create-configuration`` example creates a custom MSK configuration with the server properties that are specified in the input file. ::

    aws kafka create-configuration \
        --name "CustomConfiguration" \
        --description "Topic autocreation enabled; Apache ZooKeeper timeout 2000 ms; Log rolling 604800000 ms." \
        --kafka-versions "2.2.1" \
        --server-properties fileb://configuration.txt

Contents of ``configuration.txt``::

    auto.create.topics.enable = true
    zookeeper.connection.timeout.ms = 2000
    log.roll.ms = 604800000

This command produces no output.
Output::

    {
        "Arn": "arn:aws:kafka:us-west-2:123456789012:configuration/CustomConfiguration/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE-2",
        "CreationTime": "2019-10-09T15:26:05.548Z",
        "LatestRevision": 
            {
                "CreationTime": "2019-10-09T15:26:05.548Z",
                "Description": "Topic autocreation enabled; Apache ZooKeeper timeout 2000 ms; Log rolling 604800000 ms.",
                "Revision": 1
            },
        "Name": "CustomConfiguration"
    }

For more information, see `Amazon MSK Configuration Operations <https://docs.aws.amazon.com/msk/latest/developerguide/msk-configuration-operations.html>`__ in the *Amazon Managed Streaming for Apache Kafka Developer Guide*.
