**To list the tags applied to an ACM Certificate**

The following ``list-tags-for-certificate`` command lists the tags applied to a certificate in your account::

  aws acm list-tags-for-certificate --certificate-arn arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012

The preceding command produces output similar to the following::

  {
    "Tags": [
        {
            "Value": "Website",
            "Key": "Purpose"
        },
        {
            "Value": "Alice",
            "Key": "Admin"
        }
    ]
  }
