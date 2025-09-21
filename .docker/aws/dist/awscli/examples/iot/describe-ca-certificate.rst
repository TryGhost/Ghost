**To get details about a CA certificate**

The following ``describe-ca-certificate`` example displays the details for the specified CA certificate. ::

    aws iot describe-ca-certificate \
        --certificate-id f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467

Output::

   {
       "certificateDescription": {
           "certificateArn": "arn:aws:iot:us-west-2:123456789012:cacert/f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467",
           "certificateId": "f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467",
           "status": "INACTIVE",
           "certificatePem": "-----BEGIN CERTIFICATE-----\nMIICzzCCAbegEXAMPLEJANVEPWXl8taPMA0GCSqGSIb3DQEBBQUAMB4xCzAJBgNV\nBAYTAlVTMQ8wDQYDVQQKDAZBbWF6b24wHhcNMTkwOTI0MjEzMTE1WhcNMjkwOTIx\nMjEzMTE1WjAeMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMIIBIjANBgkq\nhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzd3R3ioalCS0MhFWfBrVGR036EK07UAf\nVdz9EXAMPLE1VczICbADnATK522kEIB51/18VzlFtAhQL5V5eybXKnB7QebNer5m\n4Yibx7shR5oqNzFsrXWxuugN5+w5gEfqNMawOjhF4LsculKG49yuqjcDU19/13ua\n3B2gxs1Pe7TiWWvUskzxnbO1F2WCshbEJvqY8fIWtGYCjTeJAgQ9hvZx/69XhKen\nwV9LJwOQxrsUS0Ty8IHwbB8fRy72VM3u7fJoaU+nO4jD5cqaoEPtzoeFUEXAMPLE\nyVAJpqHwgbYbcUfn7V+AB6yh1+0Fa1rEQGuZDPGyJslxwr5vh8nRewIDAQABoxAw\nDjAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBBQUAA4IBAQA+3a5CV3IJgOnd0AgI\nBgVMtmYzTvqAngx26aG9/spvCjXckh2SBF+EcBlCFwH1yakwjJL1dR4yarnrfxgI\nEqP4AOYVimAVoQ5FBwnloHe16+3qtDiblU9DeXBUCtS55EcfrEXAMPLEYtXdqU5C\nU9ia4KAjV0dxW1+EFYMwX5eGeb0gDTNHBylV6B/fOSZiQAwDYp4x3B+gAP+a/bWB\nu1umOqtBdWe6L6/83L+JhaTByqV25iVJ4c/UZUnG8926wUlDM9zQvEXuEVvzZ7+m\n4PSNqst/nVOvnLpoG4e0WgcJgANuB33CSWtjWSuYsbhmqQRknGhREXAMPLEZT4fm\nfo0e\n-----END CERTIFICATE-----\n",
           "ownedBy": "123456789012",
           "creationDate": 1569365372.053,
           "autoRegistrationStatus": "DISABLE",
           "lastModifiedDate": 1569365372.053,
           "customerVersion": 1,
           "generationId": "c5c2eb95-140b-4f49-9393-6aaac85b2a90",
           "validity": {
               "notBefore": 1569360675.0,
               "notAfter": 1884720675.0
           }
       }
   }

For more information, see `DescribeCACertificate <https://docs.aws.amazon.com/iot/latest/apireference/API_DescribeCACertificate.html>`__ in the *AWS IoT API Reference*.
