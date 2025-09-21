**To retrieve work units of given query**

The following ``get-work-unit-results`` example returns the work units resulting from the query. ::

    aws lakeformation get-work-units \
        --query-id='1234273f-4a62-4cda-8d98-69615ee8be9b' \
        --work-unit-id '0' \
        --work-unit-token 'B2fMSdmQXe9umX8Ux8XCo4=' outfile

Output::

    outfile with Blob content.

For more information, see `Transactional data operations <https://docs.aws.amazon.com/lake-formation/latest/dg/transactions-data-operations.html>`__ in the *AWS Lake Formation Developer Guide*.
