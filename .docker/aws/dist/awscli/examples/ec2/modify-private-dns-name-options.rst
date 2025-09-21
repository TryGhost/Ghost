**To modify the options for instance hostnames**

The following ``modify-private-dns-name-options`` example disables the option to respond to DNS queries for instance hostnames with DNS A records. ::

    aws ec2 modify-private-dns-name-options \
        --instance-id i-1234567890abcdef0 \
        --no-enable-resource-name-dns-a-record 

Output::

    {
        "Return": true
    }

For more information, see `Amazon EC2 instance hostname types <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-naming.html>`__ in the *Amazon EC2 User Guide*.
