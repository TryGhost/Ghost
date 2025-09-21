**Example 1: To change the default action to a forward action**

The following ``modify-listener`` example changes the default action to a ``forward`` action for the specified listener. ::

    aws elbv2 modify-listener \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2 \
        --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-new-targets/2453ed029918f21f

Output::

    {
        "Listeners": [
            {
                "ListenerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2",
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188",
                "Protocol": "HTTP",
                "Port": 80,
                "DefaultActions": [
                    {
                        "Type": "forward",
                        "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-new-targets/2453ed029918f21f"
                    }
                ]
            }
        ]
    }

**Example 2: To change the default action to a redirect action**

The following ``modify-listener`` example changes the default action to a ``redirect`` action for the specified listener. ::

    aws elbv2 modify-listener \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2 \
        --default-actions Type=redirect, RedirectConfig='{Protocol=HTTPS,StatusCode=HTTP_302}'

Output::

    {
        "Listeners": [
            {
                "ListenerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2",
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188",
                "Protocol": "HTTP",
                "Port": 80,
                "DefaultActions": [
                    {
                        "Type": "redirect",
                        "RedirectConfig": {
                            "Protocol": "HTTPS",
                            "Port": "#{port}",
                            "Host": "#{host}",
                            "Path": "/#{path}",
                            "Query": "#{query}",
                            "StatusCode": "HTTP_302",
                        }
                    }
                ]
            }
        ]
    }

**Example 3: To change the server certificate**

The following ``modify-listener`` example changes the server certificate for the specified HTTPS listener. ::

    aws elbv2 modify-listener \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/0467ef3c8400ae65 \
        --certificates CertificateArn=arn:aws:iam::123456789012:server-certificate/my-new-server-cert

Output::

    {
        "Listeners": [
            {
                "ListenerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/0467ef3c8400ae65",
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188",
                "Protocol": "HTTPS",
                "Port": 443,
                "DefaultActions": [
                    {
                        "Type": "forward",
                        "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067"
                    }
                ],
                "SslPolicy": "ELBSecurityPolicy-2015-05",
                "Certificates": [
                    {
                        "CertificateArn": "arn:aws:iam::123456789012:server-certificate/my-new-server-cert"
                    }
                ],
            }
        ]
    }

For more information, see `Listener rules <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html#listener-rules>`__ in the *Application Load Balancers User Guide*.