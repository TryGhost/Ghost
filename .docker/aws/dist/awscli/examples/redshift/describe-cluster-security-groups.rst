Get a Description of All Cluster Security Groups
------------------------------------------------

This example returns a description of all cluster security groups for the account.
By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-security-groups

Result::

    {
       "ClusterSecurityGroups": [
          {
             "OwnerId": "100447751468",
             "Description": "default",
             "ClusterSecurityGroupName": "default",
             "EC2SecurityGroups": \[],
             "IPRanges": [
                {
                   "Status": "authorized",
                   "CIDRIP": "0.0.0.0/0"
                }
             ]
          },
          {
             "OwnerId": "100447751468",
             "Description": "This is my cluster security group",
             "ClusterSecurityGroupName": "mysecuritygroup",
             "EC2SecurityGroups": \[],
             "IPRanges": \[]
          },
          (...remaining output omitted...)
       ]
    }

