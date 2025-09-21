**Example 1: To run a query in a workgroup on the specified table in the specified database and data catalog**

The following ``start-query-execution`` example uses the ``AthenaAdmin`` workgroup to run a query on the ``cloudfront_logs`` table in the ``cflogsdatabase`` in the ``AwsDataCatalog`` data catalog. ::

    aws athena start-query-execution \
        --query-string "select date, location, browser, uri, status from cloudfront_logs where method = 'GET' and status = 200 and location like 'SFO%' limit 10" \
        --work-group "AthenaAdmin" \
        --query-execution-context Database=cflogsdatabase,Catalog=AwsDataCatalog

Output::

    { 
    "QueryExecutionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.

**Example 2: To run a query that uses a specified workgroup to create a database in the specified data catalog**

The following ``start-query-execution`` example uses the ``AthenaAdmin`` workgroup to create the database ``newdb`` in the default data catalog ``AwsDataCatalog``. ::

    aws athena start-query-execution \
        --query-string "create database if not exists newdb" \
        --work-group "AthenaAdmin"

Output::

    { 
    "QueryExecutionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11112"
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.

**Example 3: To run a query that creates a view on a table in the specified database and data catalog**

The following ``start-query-execution`` example uses  a ``SELECT`` statement on the ``cloudfront_logs`` table in the ``cflogsdatabase`` to create the view ``cf10``. ::

    aws athena start-query-execution \
        --query-string  "CREATE OR REPLACE VIEW cf10 AS SELECT * FROM cloudfront_logs limit 10" \
        --query-execution-context Database=cflogsdatabase

Output::

    { 
    "QueryExecutionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11113"
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.