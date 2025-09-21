The following command uploads a file named ``healthcheck.sh`` to the master instance in a cluster with the cluster ID ``j-3SD91U2E1L2QX``::

  aws emr put --cluster-id j-3SD91U2E1L2QX --key-pair-file ~/.ssh/mykey.pem --src ~/scripts/healthcheck.sh --dest /home/hadoop/bin/healthcheck.sh
