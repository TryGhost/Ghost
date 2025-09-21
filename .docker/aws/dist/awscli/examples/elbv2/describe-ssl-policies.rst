**Example 1: To list the policies used for SSL negotiation by load balancer type**

The following ``describe-ssl-policies`` example displays the names of the polices that you can use for SSL negotiation with an Application Load Balancer. The example uses the ``--query`` parameter to display only the names of the policies. ::

    aws elbv2 describe-ssl-policies \
        --load-balancer-type application \
        --query SslPolicies[*].Name

Output::

    [
        "ELBSecurityPolicy-2016-08",
        "ELBSecurityPolicy-TLS13-1-2-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Res-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Ext1-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Ext2-2021-06",
        "ELBSecurityPolicy-TLS13-1-1-2021-06",
        "ELBSecurityPolicy-TLS13-1-0-2021-06",
        "ELBSecurityPolicy-TLS13-1-3-2021-06",
        "ELBSecurityPolicy-TLS-1-2-2017-01",
        "ELBSecurityPolicy-TLS-1-1-2017-01",
        "ELBSecurityPolicy-TLS-1-2-Ext-2018-06",
        "ELBSecurityPolicy-FS-2018-06",
        "ELBSecurityPolicy-2015-05",
        "ELBSecurityPolicy-TLS-1-0-2015-04",
        "ELBSecurityPolicy-FS-1-2-Res-2019-08",
        "ELBSecurityPolicy-FS-1-1-2019-08",
        "ELBSecurityPolicy-FS-1-2-2019-08",
        "ELBSecurityPolicy-FS-1-2-Res-2020-10"
    ]

**Example 2: To list the policies that support a specific protocol**

The following ``describe-ssl-policies`` example displays the names of the polices that support the TLS 1.3 protocol. The example uses the ``--query`` parameter to display only the names of the policies. ::

    aws elbv2 describe-ssl-policies \
        --load-balancer-type application \
        --query SslPolicies[?contains(SslProtocols,'TLSv1.3')].Name

Output::

    [
        "ELBSecurityPolicy-TLS13-1-2-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Res-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Ext1-2021-06",
        "ELBSecurityPolicy-TLS13-1-2-Ext2-2021-06",
        "ELBSecurityPolicy-TLS13-1-1-2021-06",
        "ELBSecurityPolicy-TLS13-1-0-2021-06",
        "ELBSecurityPolicy-TLS13-1-3-2021-06"
    ]

**Example 3: To display the ciphers for a policy**

The following ``describe-ssl-policies`` example displays the names of the ciphers for the specified policy. The example uses the ``--query`` parameter to display only the cipher names. The first cipher in the list has priority 1, and the remaining ciphers are in priority order. ::

    aws elbv2 describe-ssl-policies \
        --names ELBSecurityPolicy-TLS13-1-2-2021-06 \
        --query SslPolicies[*].Ciphers[*].Name

Output::

    [
        "TLS_AES_128_GCM_SHA256",
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES128-GCM-SHA256",
        "ECDHE-ECDSA-AES128-SHA256",
        "ECDHE-RSA-AES128-SHA256",
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-AES256-SHA384",
        "ECDHE-RSA-AES256-SHA384"
    ]

For more information, see `Security policies <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html#describe-ssl-policies>`__ in the *User Guide for Application Load Balancers*.