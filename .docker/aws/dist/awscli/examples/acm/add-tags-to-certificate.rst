**To add tags to an existing ACM Certificate**

The following ``add-tags-to-certificate`` command adds two tags to the specified certificate. Use a space to separate multiple tags::

  aws acm add-tags-to-certificate --certificate-arn arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012 --tags Key=Admin,Value=Alice Key=Purpose,Value=Website


