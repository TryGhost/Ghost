The following command opens an ssh connection with the master instance in a cluster with the cluster ID ``j-3SD91U2E1L2QX``::

  aws emr ssh --cluster-id j-3SD91U2E1L2QX --key-pair-file ~/.ssh/mykey.pem

The key pair file option takes a local path to a private key file.

Output::

  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=10 -i /home/local/user/.ssh/mykey.pem hadoop@ec2-52-52-41-150.us-west-2.compute.amazonaws.com
  Warning: Permanently added 'ec2-52-52-41-150.us-west-2.compute.amazonaws.com,52.52.41.150' (ECDSA) to the list of known hosts.
  Last login: Mon Jun  1 23:15:38 2015
  
        __|  __|_  )
         _|  (     /   Amazon Linux AMI
        ___|\___|___|
  
  https://aws.amazon.com/amazon-linux-ami/2015.03-release-notes/
  26 package(s) needed for security, out of 39 available
  Run "sudo yum update" to apply all updates.
  
  --------------------------------------------------------------------------------
  
  Welcome to Amazon Elastic MapReduce running Hadoop and Amazon Linux.
  
  Hadoop is installed in /home/hadoop. Log files are in /mnt/var/log/hadoop. Check
  /mnt/var/log/hadoop/steps for diagnosing step failures.

  The Hadoop UI can be accessed via the following commands:
  
    ResourceManager    lynx http://ip-172-21-11-216:9026/
    NameNode           lynx http://ip-172-21-11-216:9101/
  
  --------------------------------------------------------------------------------
  
  [hadoop@ip-172-31-16-216 ~]$
