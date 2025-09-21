Describe Resize
---------------

This example describes the latest resize of a cluster. The request was for 3 nodes of type ``dw.hs1.8xlarge``.

Command::

   aws redshift describe-resize --cluster-identifier mycluster

Result::

    {
       "Status": "NONE",
       "TargetClusterType": "multi-node",
       "TargetNodeType": "dw.hs1.8xlarge",
       "ResponseMetadata": {
          "RequestId": "9f52b0b4-7733-11e2-aa9b-318b2909bd27"
       },
       "TargetNumberOfNodes": "3"
    }

