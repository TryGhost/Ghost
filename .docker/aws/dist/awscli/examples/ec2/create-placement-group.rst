**To create a placement group**

This example command creates a placement group with the specified name.

Command::

  aws ec2 create-placement-group --group-name my-cluster --strategy cluster

**To create a partition placement group**

This example command creates a partition placement group named ``HDFS-Group-A`` with five partitions. 

Command::

  aws ec2 create-placement-group --group-name HDFS-Group-A --strategy partition --partition-count 5
