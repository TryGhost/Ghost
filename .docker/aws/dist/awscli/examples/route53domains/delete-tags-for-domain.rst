**To delete tags for a domain**

The following ``delete-tags-for-domain`` command deletes three tags from the specified domain. Note that you specify only the tag key, not the tag value. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains delete-tags-for-domain \
        --region us-east-1 \
        --domain-name example.com \
        --tags-to-delete accounting-key hr-key engineering-key

This command produces no output. 

To confirm that the tags were deleted, you can run `list-tags-for-domain <https://docs.aws.amazon.com/cli/latest/reference/route53domains/list-tags-for-domain.html>`__ . 
For more information, see `Tagging Amazon Route 53 Resources <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/tagging-resources.html>`__ in the *Amazon Route 53 Developer Guide*.
