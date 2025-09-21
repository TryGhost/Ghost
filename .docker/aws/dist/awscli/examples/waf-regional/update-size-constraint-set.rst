**To update a size constraint set**

The following ``update-size-constraint-set`` command  deletes a `SizeConstraint`` object (filters) in a size constraint set. Because the ``updates`` value contains embedded double quotes, you must surround the entire value with single quotes. ::

    aws waf-regional update-size-constraint-set \
        --size-constraint-set-id a123fae4-b567-8e90-1234-5ab67ac8ca90 \
        --change-token 12cs345-67cd-890b-1cd2-c3a4567d89f1 \
        --updates 'Action="DELETE",SizeConstraint={FieldToMatch={Type="QUERY_STRING"},TextTransformation="NONE",ComparisonOperator="GT",Size=0}'

For more information, see `Working with Size Constraint Conditions <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-size-conditions.html>`__ in the *AWS WAF Developer Guide*.
