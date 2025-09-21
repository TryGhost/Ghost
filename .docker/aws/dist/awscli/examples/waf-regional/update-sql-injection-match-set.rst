**To update a SQL Injection Match Set**

The following ``update-sql-injection-match-set`` command  deletes a ``SqlInjectionMatchTuple`` object (filters) in a SQL injection match set. Because the ``updates`` value contains embedded double quotes, you must surround the entire value in single quotes. :

    aws waf-regional update-sql-injection-match-set \
        --sql-injection-match-set-id a123fae4-b567-8e90-1234-5ab67ac8ca90 \
        --change-token 12cs345-67cd-890b-1cd2-c3a4567d89f1 \
        --updates 'Action="DELETE",SqlInjectionMatchTuple={FieldToMatch={Type="QUERY_STRING"},TextTransformation="URL_DECODE"}'

For more information, see `Working with SQL Injection Match Conditions <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-sql-conditions.html>`__ in the *AWS WAF Developer Guide*.
