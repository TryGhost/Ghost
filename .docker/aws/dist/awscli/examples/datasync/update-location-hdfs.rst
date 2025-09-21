**To update your transfer location with a new agent**

The following ``update-location-hdfs`` example updates your DataSync HDFS location with a new agent. You only need the ``--kerberos-keytab`` and ``--kerberos-krb5-conf`` options if your HDFS cluster uses Kerberos authentication. ::

    aws datasync update-location-hdfs \
        --location-arn arn:aws:datasync:us-west-2:123456789012:location/loc-abcdef01234567890 \
        --agent-arns arn:aws:datasync:us-west-2:123456789012:agent/agent-1234567890abcdef0 \
        --kerberos-keytab file://hdfs.keytab
        --kerberos-krb5-conf file://krb5.conf

Contents of ``hdfs.keytab``::

    N/A. The content of this file is encrypted and not human readable.

Contents of ``krb5.conf``::

    [libdefaults]  
        default_realm = EXAMPLE.COM
        dns_lookup_realm = false
        dns_lookup_kdc = false
        rdns = true
        ticket_lifetime = 24h
        forwardable = true
        udp_preference_limit = 1000000
        default_tkt_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96 des3-cbc-sha1
        default_tgs_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96 des3-cbc-sha1
        permitted_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96 des3-cbc-sha1
    
    [realms]
        EXAMPLE.COM = {
          kdc = kdc1.example.com
          admin_server = krbadmin.example.com
          default_domain = example.com
        }
    
    [domain_realm]
        .example.com = EXAMPLE.COM
        example.com = EXAMPLE.COM 
    
    [logging]
        kdc = FILE:/var/log/krb5kdc.log
        admin_server = FILE:/var/log/kerberos/kadmin.log
        default = FILE:/var/log/krb5libs.log

This command produces no output.

For more information, see `Replacing your agent <https://docs.aws.amazon.com/datasync/latest/userguide/replacing-agent.html>`__ in the *AWS DataSync User Guide*.