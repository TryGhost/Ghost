**1. To create a security configuration with in-transit encryption enabled with PEM for certificate provider, and at-rest encryption enabled with SSE-S3 for S3 encryption and AWS-KMS for local disk key provider**

- Command::

	 aws emr create-security-configuration --name MySecurityConfig --security-configuration '{
		"EncryptionConfiguration": {
			"EnableInTransitEncryption" : true,
			"EnableAtRestEncryption" : true,
			"InTransitEncryptionConfiguration" : {
				"TLSCertificateConfiguration" : {
					"CertificateProviderType" : "PEM",
					"S3Object" : "s3://mycertstore/artifacts/MyCerts.zip"
				}
			},
			"AtRestEncryptionConfiguration" : {
				"S3EncryptionConfiguration" : {
					"EncryptionMode" : "SSE-S3"
				},
				"LocalDiskEncryptionConfiguration" : {
					"EncryptionKeyProviderType" : "AwsKms",
					"AwsKmsKey" : "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
				}
			}
		}
	}'

- Output::

    {
    "CreationDateTime": 1474070889.129,
    "Name": "MySecurityConfig"
    }

- JSON equivalent (contents of security_configuration.json)::

    {
        "EncryptionConfiguration": {
            "EnableInTransitEncryption": true,
            "EnableAtRestEncryption": true,
            "InTransitEncryptionConfiguration": {
                "TLSCertificateConfiguration": {
                    "CertificateProviderType": "PEM",
                    "S3Object": "s3://mycertstore/artifacts/MyCerts.zip"
                }
            },
            "AtRestEncryptionConfiguration": {
                "S3EncryptionConfiguration": {
                    "EncryptionMode": "SSE-S3"
                },
                "LocalDiskEncryptionConfiguration": {
                    "EncryptionKeyProviderType": "AwsKms",
                    "AwsKmsKey": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
                }
            }
        }
    }

- Command (using security_configuration.json)::

   aws emr create-security-configuration --name "MySecurityConfig" --security-configuration file://./security_configuration.json

- Output::

    {
    "CreationDateTime": 1474070889.129,
    "Name": "MySecurityConfig"
    }

**2. To create a security configuration with Kerberos enabled using cluster-dedicated KDC and cross-realm trust**

- Command::

     aws emr create-security-configuration --name MySecurityConfig --security-configuration '{
         "AuthenticationConfiguration": {
             "KerberosConfiguration": {
                 "Provider": "ClusterDedicatedKdc",
                 "ClusterDedicatedKdcConfiguration": {
                     "TicketLifetimeInHours": 24,
                     "CrossRealmTrustConfiguration": {
                       "Realm": "AD.DOMAIN.COM",
                       "Domain": "ad.domain.com",
                       "AdminServer": "ad.domain.com",
                       "KdcServer": "ad.domain.com"
                     }
                 }
             }
         }
    }'

- Output::

    {
    "CreationDateTime": 1490225558.982,
    "Name": "MySecurityConfig"
    }

- JSON equivalent (contents of security_configuration.json)::

    {
        "AuthenticationConfiguration": {
            "KerberosConfiguration": {
                "Provider": "ClusterDedicatedKdc",
                "ClusterDedicatedKdcConfiguration": {
                    "TicketLifetimeInHours": 24,
                    "CrossRealmTrustConfiguration": {
                        "Realm": "AD.DOMAIN.COM",
                        "Domain": "ad.domain.com",
                        "AdminServer": "ad.domain.com",
                        "KdcServer": "ad.domain.com"
                    }
                }
            }
        }
    }

- Command (using security_configuration.json)::

   aws emr create-security-configuration --name "MySecurityConfig" --security-configuration file://./security_configuration.json

- Output::

    {
    "CreationDateTime": 1490225558.982,
    "Name": "MySecurityConfig"
    }
