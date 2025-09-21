**To create a named query**

The following ``create-named-query`` example creates a saved query in the ``AthenaAdmin`` workgroup that queries the ``flights_parquet`` table for flights from Seattle to New York in January, 2016 whose departure and arrival were both delayed by more than ten minutes. Because the airport code values in the table are strings that include double quotes (for example, "SEA"), they are escaped by backslashes and surrounded by single quotes. ::

    aws athena create-named-query \
        --name "SEA to JFK delayed flights Jan 2016" \
        --description "Both arrival and departure delayed more than 10 minutes." \
        --database sampledb \
        --query-string "SELECT flightdate, carrier, flightnum, origin, dest, depdelayminutes, arrdelayminutes FROM sampledb.flights_parquet WHERE yr = 2016 AND month = 1 AND origin = '\"SEA\"' AND dest = '\"JFK\"' AND depdelayminutes > 10 AND arrdelayminutes > 10" \
        --work-group AthenaAdmin

Output::

    {
        "NamedQueryId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.