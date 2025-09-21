Following command exports a template named ``template.json`` by uploading local
artifacts to S3 bucket ``bucket-name`` and writes the exported template to
``packaged-template.json``::

    aws cloudformation package --template-file /path_to_template/template.json --s3-bucket bucket-name --output-template-file packaged-template.json --use-json

