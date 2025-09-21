**To delete a Firewall Manager policy**

The following ``delete-policy`` example removes the policy with the specified ID, along with all of its resources. ::

    aws fms delete-policy \
        --policy-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --delete-all-policy-resources

This command produces no output.

For more information, see `Working with AWS Firewall Manager Policies <https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
