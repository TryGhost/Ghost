Delete a Cluster with No Final Cluster Snapshot
-----------------------------------------------

This example deletes a cluster, forcing data deletion so no final cluster snapshot
is created.

Command::

   aws redshift delete-cluster --cluster-identifier mycluster --skip-final-cluster-snapshot


Delete a Cluster, Allowing a Final Cluster Snapshot
---------------------------------------------------

This example deletes a cluster, but specifies a final cluster snapshot.

Command::

   aws redshift delete-cluster --cluster-identifier mycluster --final-cluster-snapshot-identifier myfinalsnapshot


