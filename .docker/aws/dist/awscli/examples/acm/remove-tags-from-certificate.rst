**To remove a tag from an ACM Certificate**

The following ``remove-tags-from-certificate`` command removes two tags from the specified certificate. Use a space to separate multiple tags::

  aws acm remove-tags-from-certificate --certificate-arn arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012 --tags Key=Admin,Value=Alice Key=Purpose,Value=Website


