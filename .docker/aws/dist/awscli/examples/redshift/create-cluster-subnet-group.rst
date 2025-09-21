Create a Cluster Subnet Group
-----------------------------

This example creates a new cluster subnet group.

Command::

   aws redshift create-cluster-subnet-group --cluster-subnet-group-name mysubnetgroup  --description "My subnet group" --subnet-ids subnet-763fdd1c

Result::

    {
       "ClusterSubnetGroup": {
          "Subnets": [
             {
                "SubnetStatus": "Active",
                "SubnetIdentifier": "subnet-763fdd1c",
                "SubnetAvailabilityZone": {
                   "Name": "us-east-1a"
                }
             } ],
          "VpcId": "vpc-7e3fdd14",
          "SubnetGroupStatus": "Complete",
          "Description": "My subnet group",
          "ClusterSubnetGroupName": "mysubnetgroup"
       },
       "ResponseMetadata": {
          "RequestId": "500b8ce2-698f-11e2-9790-fd67517fb6fd"
       }
    }


