**To wait for the existence of a table**

The following ``wait`` example pauses and resumes only after it can confirm that the specified table exists. ::

    aws dynamodb wait table-exists \
        --table-name MusicCollection


This command produces no output.

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.
