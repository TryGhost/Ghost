**To bundle an instance**

This example bundles instance ``i-1234567890abcdef0`` to a bucket called ``bundletasks``. Before you specify values for your access key IDs, review and follow the guidance in `Best Practices for Managing AWS Access Keys`_.

Command::

  aws ec2 bundle-instance --instance-id i-1234567890abcdef0 --bucket bundletasks --prefix winami --owner-akid AK12AJEXAMPLE --owner-sak example123example

Output::

  {
    "BundleTask": {
      "UpdateTime": "2015-09-15T13:30:35.000Z", 
      "InstanceId": "i-1234567890abcdef0", 
      "Storage": {
        "S3": {
          "Prefix": "winami", 
          "Bucket": "bundletasks"
        }
      }, 
      "State": "pending", 
      "StartTime": "2015-09-15T13:30:35.000Z", 
      "BundleId": "bun-294e041f"
    }
  }

.. _`Best Practices for Managing AWS Access Keys`: http://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html