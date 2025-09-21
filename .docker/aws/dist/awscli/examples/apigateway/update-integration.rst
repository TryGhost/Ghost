**To add the 'Content-Type: application/json' Mapping Template configured with Input Passthrough**

Command::

    aws apigateway update-integration \
        --rest-api-id a1b2c3d4e5 \
        --resource-id a1b2c3 \
        --http-method POST \
        --patch-operations "op='add',path='/requestTemplates/application~1json'"

**To update (replace) the 'Content-Type: application/json' Mapping Template configured with a custom template**

Command::

    aws apigateway update-integration \
        --rest-api-id a1b2c3d4e5 \
        --resource-id a1b2c3 \
        --http-method POST \
        --patch-operations "op='replace',path='/requestTemplates/application~1json',value='{"example": "json"}'"

**To update (replace) a custom template associated with 'Content-Type: application/json' with Input Passthrough**

Command::

    aws apigateway update-integration \
        --rest-api-id a1b2c3d4e5 \
        --resource-id a1b2c3 \
        --http-method POST \
        --patch-operations "op='replace',path='requestTemplates/application~1json'"

**To remove the 'Content-Type: application/json' Mapping Template**

Command::

    aws apigateway update-integration \
        --rest-api-id a1b2c3d4e5 \
        --resource-id a1b2c3 \
        --http-method POST \
        --patch-operations "op='remove',path='/requestTemplates/application~1json'"
