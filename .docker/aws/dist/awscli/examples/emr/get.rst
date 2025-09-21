The following downloads the ``hadoop-examples.jar`` archive from the master instance in a cluster with the cluster ID ``j-3SD91U2E1L2QX``::

  aws emr get --cluster-id j-3SD91U2E1L2QX --key-pair-file ~/.ssh/mykey.pem --src /home/hadoop-examples.jar --dest ~
