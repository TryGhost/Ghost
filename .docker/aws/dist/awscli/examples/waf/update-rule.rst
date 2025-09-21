**To update a rule**

The following ``update-rule`` command  deletes a Predicate object in a rule::


 aws waf update-rule --rule-id a123fae4-b567-8e90-1234-5ab67ac8ca90 --change-token 12cs345-67cd-890b-1cd2-c3a4567d89f1 --updates Action="DELETE",Predicate={Negated=false,Type="ByteMatch",DataId="MyByteMatchSetID"}





For more information, see `Working with Rules`_ in the *AWS WAF* developer guide.

.. _`Working with Rules`:
 https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rules.html

