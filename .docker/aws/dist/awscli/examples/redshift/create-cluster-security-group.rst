Creating a Cluster Security Group
---------------------------------

This example creates a new cluster security group. By default, the output is in JSON format.

Command::

   aws redshift create-cluster-security-group --cluster-security-group-name mysecuritygroup --description "This is my cluster security group"

Result::

    {
       "create_cluster_security_group_response": {
          "create_cluster_security_group_result": {
             "cluster_security_group": {
                "description": "This is my cluster security group",
                "owner_id": "300454760768",
                "cluster_security_group_name": "mysecuritygroup",
                "ec2_security_groups": \[],
                "ip_ranges": \[]
             }
          },
          "response_metadata": {
             "request_id": "5df486a0-343a-11e2-b0d8-d15d0ef48549"
          }
       }
    }

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift create-cluster-security-group --cluster-security-group-name mysecuritygroup --description "This is my cluster security group" --output text

Result::

    This is my cluster security group	300454760768	mysecuritygroup
    a0c0bfab-343a-11e2-95d2-c3dc9fe8ab57


