**To add or update tags for a domain**

The following ``update-tags-for-domain`` command adds or updates two keys and the corresponding values for the example.com domain. To update the value for a key, just include the key and the new value. You can add or update tags in only one domain at a time. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains update-tags-for-domain \
        --region us-east-1 \
        --domain-name example.com \
        --tags-to-update "Key=key1,Value=value1" "Key=key2,Value=value2"

This command produces no output. To confirm that the tags were added or updated, you can run `list-tags-for-domain <https://docs.aws.amazon.com/cli/latest/reference/route53domains/list-tags-for-domain.html>`__ .

For more information, see `Tagging Amazon Route 53 Resources <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/tagging-resources.html>`__ in the *Amazon Route 53 Developer Guide*.
