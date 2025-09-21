**To authorize cache security group for ingress**

The following ``authorize-cache-security-group-ingress`` example allows network ingress to a cache security group. ::

    aws elasticache authorize-cache-security-group-ingress \
         --cache-security-group-name  "my-sec-grp" \
         --ec2-security-group-name "my-ec2-sec-grp" \
         --ec2-security-group-owner-id "1234567890"

The command produces no output.

For more information, see `Self-Service Updates in Amazon ElastiCache <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Self-Service-Updates.html>`__ in the *Elasticache User Guide*.