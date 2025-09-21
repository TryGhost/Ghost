**To list the named queries for a workgroup**

The following ``list-named-queries`` example lists the named queries for the ``AthenaAdmin`` workgroup. ::

    aws athena list-named-queries \
        --work-group AthenaAdmin

Output::

    {
        "NamedQueryIds": [
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333"
        ]
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.