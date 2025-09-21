Describing All Orderable Cluster Options
----------------------------------------

This example returns descriptions of all orderable cluster options.  By default, the output is in JSON format.

Command::

   aws redshift describe-orderable-cluster-options

Result::

    {
       "OrderableClusterOptions": [
          {
             "NodeType": "dw.hs1.8xlarge",
             "AvailabilityZones": [
                { "Name": "us-east-1a" },
                { "Name": "us-east-1b" },
                { "Name": "us-east-1c" } ],
             "ClusterVersion": "1.0",
             "ClusterType": "multi-node"
          },
          {
             "NodeType": "dw.hs1.xlarge",
             "AvailabilityZones": [
                { "Name": "us-east-1a" },
                { "Name": "us-east-1b" },
                { "Name": "us-east-1c" } ],
             "ClusterVersion": "1.0",
             "ClusterType": "multi-node"
          },
          {
          "NodeType": "dw.hs1.xlarge",
          "AvailabilityZones": [
             { "Name": "us-east-1a" },
             { "Name": "us-east-1b" },
             { "Name": "us-east-1c" } ],
          "ClusterVersion": "1.0",
          "ClusterType": "single-node"
          } ],
       "ResponseMetadata": {
          "RequestId": "f6000035-64cb-11e2-9135-ff82df53a51a"
       }
    }

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift describe-orderable-cluster-options --output text

Result::

    dw.hs1.8xlarge	1.0	multi-node
    us-east-1a
    us-east-1b
    us-east-1c
    dw.hs1.xlarge	1.0	multi-node
    us-east-1a
    us-east-1b
    us-east-1c
    dw.hs1.xlarge	1.0	single-node
    us-east-1a
    us-east-1b
    us-east-1c
    RESPONSEMETADATA	e648696b-64cb-11e2-bec0-17624ad140dd


