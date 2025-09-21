Associate a Security Group with a Cluster
-----------------------------------------

This example shows how to associate a cluster security group with the specified cluster.

Command::

   aws redshift modify-cluster --cluster-identifier mycluster --cluster-security-groups mysecuritygroup


Modify the Maintenance Window for a Cluster
-------------------------------------------

This shows how to change the weekly preferred maintenance window for a cluster to be the minimum four hour window
starting Sundays at 11:15 PM, and ending Mondays at 3:15 AM.

Command::

   aws redshift modify-cluster --cluster-identifier mycluster --preferred-maintenance-window Sun:23:15-Mon:03:15

Change the Master Password for the Cluster
------------------------------------------

This example shows how to change the master password for a cluster.

Command::

   aws redshift modify-cluster --cluster-identifier mycluster --master-user-password A1b2c3d4


