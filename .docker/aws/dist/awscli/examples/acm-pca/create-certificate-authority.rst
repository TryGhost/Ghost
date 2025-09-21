**To create a private certificate authority**

The following ``create-certificate-authority`` command creates a private certificate authority in your AWS account. ::

  aws acm-pca create-certificate-authority --certificate-authority-configuration file://C:\ca_config.txt --revocation-configuration file://C:\revoke_config.txt --certificate-authority-type "SUBORDINATE" --idempotency-token 98256344