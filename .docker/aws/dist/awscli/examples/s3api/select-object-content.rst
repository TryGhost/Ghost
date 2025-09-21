**To filter the contents of an Amazon S3 object based on an SQL statement**

The following ``select-object-content`` example filters the object ``my-data-file.csv`` with the specified SQL statement and sends output to a file. ::

    aws s3api select-object-content \
        --bucket amzn-s3-demo-bucket \
        --key my-data-file.csv \
        --expression "select * from s3object limit 100" \
        --expression-type 'SQL' \
        --input-serialization '{"CSV": {}, "CompressionType": "NONE"}' \
        --output-serialization '{"CSV": {}}' "output.csv"

This command produces no output.
