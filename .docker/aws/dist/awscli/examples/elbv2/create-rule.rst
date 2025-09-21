**Example 1: To create a rule using a path condition and a forward action**

The following ``create-rule`` example creates a rule that forwards requests to the specified target group if the URL contains the specified pattern. ::

    aws elbv2 create-rule \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2 \
        --priority 5 \
        --conditions file://conditions-pattern.json 
        --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

Contents of ``conditions-pattern.json``::

    [
        {
            "Field": "path-pattern",
            "PathPatternConfig": {
                "Values": ["/images/*"]
            }
        }
    ]

**Example 2: To create a rule using a host condition and a fixed response**

The following ``create-rule`` example creates a rule that provides a fixed response if the hostname in the host header matches the specified hostname. ::

    aws elbv2 create-rule \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2 \
        --priority 10 \
        --conditions file://conditions-host.json \
        --actions file://actions-fixed-response.json

Contents of ``conditions-host.json`` ::

  [
    {
        "Field": "host-header",
        "HostHeaderConfig": {
            "Values": ["*.example.com"]
        }
    }
  ]

Contents of ``actions-fixed-response.json`` ::

    [
        {
            "Type": "fixed-response",
            "FixedResponseConfig": {
                "MessageBody": "Hello world",
                "StatusCode": "200",
                "ContentType": "text/plain"
            }
        }
    ]

**Example 3: To create a rule using a source IP address condition, an authenticate action, and a forward action**

The following ``create-rule`` example creates a rule that authenticates the user if the source IP address matches the specified IP address, and forwards the request to the specified target group if authentication is successful. :: 

    aws elbv2 create-rule \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2 \
        --priority 20 \
        --conditions file://conditions-source-ip.json \
        --actions file://actions-authenticate.json

Contents of ``conditions-source-ip.json`` ::

    [
        {
            "Field": "source-ip",
            "SourceIpConfig": {
                "Values": ["192.0.2.0/24", "198.51.100.10/32"]
            }
        }
    ]

Contents of ``actions-authenticate.json`` ::

    [
        {
            "Type": "authenticate-oidc",
            "AuthenticateOidcConfig": {
                "Issuer": "https://idp-issuer.com",
                "AuthorizationEndpoint": "https://authorization-endpoint.com",
                "TokenEndpoint": "https://token-endpoint.com",
                "UserInfoEndpoint": "https://user-info-endpoint.com",
                "ClientId": "abcdefghijklmnopqrstuvwxyz123456789",
                "ClientSecret": "123456789012345678901234567890",
                "SessionCookieName": "my-cookie",
                "SessionTimeout": 3600,
                "Scope": "email",
                "AuthenticationRequestExtraParams": {
                    "display": "page",
                    "prompt": "login"
                },
                "OnUnauthenticatedRequest": "deny"
            },
            "Order": 1
        },
        {
            "Type": "forward",
            "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:880185128111:targetgroup/cli-test/642a97ecb0e0f26b",
            "Order": 2
        }
    ]
