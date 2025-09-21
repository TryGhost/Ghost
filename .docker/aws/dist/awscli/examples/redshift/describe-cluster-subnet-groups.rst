Get a Description of All Cluster Subnet Groups
----------------------------------------------

This example returns a description of all cluster subnet groups.  By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-subnet-groups

Result::

    {
       "ClusterSubnetGroups": [
          {
             "Subnets": [
                {
                   "SubnetStatus": "Active",
                   "SubnetIdentifier": "subnet-763fdd1c",
                   "SubnetAvailabilityZone": {
                      "Name": "us-east-1a"
                   }
                }
             ],
             "VpcId": "vpc-7e3fdd14",
             "SubnetGroupStatus": "Complete",
             "Description": "My subnet group",
             "ClusterSubnetGroupName": "mysubnetgroup"
          }
       ],
       "ResponseMetadata": {
          "RequestId": "37fa8c89-6990-11e2-8f75-ab4018764c77"
       }
    }

