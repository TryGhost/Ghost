 **To update a service to add an attribute**

The following ``update-service-attributes`` example updates the specified service to add a service attribute with a key ``Port`` and a value ``80``. ::

    aws servicediscovery update-service-attributes \
        --service-id srv-e4anhexample0004 \
        --attributes Port=80

This command produces no output.

For more information, see `AWS Cloud Map services <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html>`__ in the *AWS Cloud Map Developer Guide*.
