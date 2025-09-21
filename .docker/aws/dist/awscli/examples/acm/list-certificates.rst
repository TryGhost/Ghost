**To list the ACM certificates for an AWS account**

The following ``list-certificates`` command lists the ARNs of the certificates in your account::

  aws acm list-certificates

The preceding command produces output similar to the following::

  {
      "CertificateSummaryList": [
          {
              "CertificateArn": "arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012", 
              "DomainName": "www.example.com"
          }, 
          {
              "CertificateArn": "arn:aws:acm:region:account:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", 
              "DomainName": "www.example.net"
          }
      ]
  }

You can decide how many certificates you want to display each time you call ``list-certificates``. For example, if you have four certificates and you want to display no more than two at a time, set the ``max-items`` argument to 2 as in the following example::

  aws acm list-certificates --max-items 2

Two certificate ARNs and a ``NextToken`` value will be displayed::

  "CertificateSummaryList": [
    {
      "CertificateArn": "arn:aws:acm:region:account: \
              certificate/12345678-1234-1234-1234-123456789012", 
      "DomainName": "www.example.com"
    }, 
    {
      "CertificateArn": "arn:aws:acm:region:account: \
               certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", 
      "DomainName": "www.example.net"
    }
    ], 
      "NextToken": "9f4d9f69-275a-41fe-b58e-2b837bd9ba48"

To display the next two certificates in your account, set this ``NextToken`` value in your next call::

  aws acm list-certificates --max-items 2 --next-token 9f4d9f69-275a-41fe-b58e-2b837bd9ba48


You can filter your output by using the ``certificate-statuses`` argument. The following command displays certificates that have a PENDING_VALIDATION status::

  aws acm list-certificates --certificate-statuses PENDING_VALIDATION

You can also filter your output by using the ``includes`` argument. The following command displays certificates filtered on the following properties. The certificates to be displayed::

  - Specify that the RSA algorithm and a 2048 bit key are used to generate key pairs.
  - Contain a Key Usage extension that specifies that the certificates can be used to create digital signatures.
  - Contain an Extended Key Usage extension that specifies that the certificates can be used for code signing.
  
  aws acm list-certificates --max-items 10 --includes extendedKeyUsage=CODE_SIGNING,keyUsage=DIGITAL_SIGNATURE,keyTypes=RSA_2048

