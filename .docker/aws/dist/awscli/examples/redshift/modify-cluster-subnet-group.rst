Modify the Subnets in a Cluster Subnet Group
--------------------------------------------

This example shows how to modify the list of subnets in a cache subnet group.  By default, the output is in JSON format.

Command::

   aws redshift modify-cluster-subnet-group --cluster-subnet-group-name mysubnetgroup --subnet-ids subnet-763fdd1 subnet-ac830e9

Result::

    {
       "ClusterSubnetGroup":
       {
          "Subnets": [
             {
                "SubnetStatus": "Active",
                "SubnetIdentifier": "subnet-763fdd1c",
                "SubnetAvailabilityZone":
                   { "Name": "us-east-1a" }
             },
             {
                "SubnetStatus": "Active",
                "SubnetIdentifier": "subnet-ac830e9",
                "SubnetAvailabilityZone":
                   { "Name": "us-east-1b" }
             } ],
          "VpcId": "vpc-7e3fdd14",
          "SubnetGroupStatus": "Complete",
          "Description": "My subnet group",
          "ClusterSubnetGroupName": "mysubnetgroup"
       },
       "ResponseMetadata": {
          "RequestId": "8da93e89-8372-f936-93a8-873918938197a"
       }
    }

