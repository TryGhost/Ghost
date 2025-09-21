**To update a byte match set**

The following ``update-byte-match-set`` command  deletes a ByteMatchTuple object (filter) in a ByteMatchSet::

 aws waf update-byte-match-set --cli-binary-format raw-in-base64-out --byte-match-set-id a123fae4-b567-8e90-1234-5ab67ac8ca90 --change-token 12cs345-67cd-890b-1cd2-c3a4567d89f1 --updates Action="DELETE",ByteMatchTuple={FieldToMatch={Type="HEADER",Data="referer"},TargetString="badrefer1",TextTransformation="NONE",PositionalConstraint="CONTAINS"}




For more information, see `Working with String Match Conditions`_ in the *AWS WAF* developer guide.

.. _`Working with String Match Conditions`: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-string-conditions.html

