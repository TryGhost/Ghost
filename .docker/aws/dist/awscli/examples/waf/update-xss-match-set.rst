**To update an XSSMatchSet**

The following ``update-xss-match-set`` command  deletes an XssMatchTuple object (filters) in an XssMatchSet::

 aws waf update-xss-match-set --xss-match-set-id a123fae4-b567-8e90-1234-5ab67ac8ca90 --change-token 12cs345-67cd-890b-1cd2-c3a4567d89f1 --updates Action="DELETE",XssMatchTuple={FieldToMatch={Type="QUERY_STRING"},TextTransformation="URL_DECODE"}




For more information, see `Working with Cross-site Scripting Match Conditions`_ in the *AWS WAF* developer guide.

.. _`Working with Cross-site Scripting Match Conditions`: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-xss-conditions.html

