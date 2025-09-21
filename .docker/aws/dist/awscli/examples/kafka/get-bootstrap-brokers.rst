**To get bootstrap brokers**

The following ``get-bootstrap-brokers`` example retrieves the bootstrap broker information for an Amazon MSK cluster. ::

    aws kafka get-bootstrap-brokers \
        --cluster-arn arn:aws:kafka:us-east-1:123456789012:cluster/demo-cluster-1/6357e0b2-0e6a-4b86-a0b4-70df934c2e31-5

Output::

    {
        "BootstrapBrokerString": "b-1.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:9092,b-2.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:9092",
        "BootstrapBrokerStringTls": "b-1.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:9094,b-2.demo-cluster-1.xuy0sb.c5.kafka.us-east-1.amazonaws.com:9094"
    }

For more information, see `Getting the Bootstrap Brokers <https://docs.aws.amazon.com/msk/latest/developerguide/msk-get-bootstrap-brokers.html>`__ in the *Amazon Managed Streaming for Apache Kafka Developer Guide*.



