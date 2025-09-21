**Example 1: To create a VCF annotation store**

The following ``create-annotation-store`` example creates a VCF format annotation store. ::

    aws omics create-annotation-store \
        --name my_ann_store \
        --store-format VCF \
        --reference referenceArn=arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890

Output::

    {
        "creationTime": "2022-11-23T22:48:39.226492Z",
        "id": "0a91xmplc71f",
        "name": "my_ann_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "CREATING",
        "storeFormat": "VCF"
    }

**Example 2: To create a TSV annotation store**

The following ``create-annotation-store`` example creates a TSV format annotation store. ::

    aws omics create-annotation-store \
        --name tsv_ann_store \
        --store-format TSV \
        --reference referenceArn=arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890 \
        --store-options file://tsv-store-options.json

``tsv-store-options.json`` configures format options for annotations. ::

    {
        "tsvStoreOptions": {
            "annotationType": "CHR_START_END_ZERO_BASE",
            "formatToHeader": {
                "CHR": "chromosome",
                "START": "start",
                "END": "end"
            },
            "schema": [
                {
                    "chromosome": "STRING"
                },
                {
                    "start": "LONG"
                },
                {
                    "end": "LONG"
                },
                {
                    "name": "STRING"
                }
            ]
        }
    }

Output::

    {
        "creationTime": "2022-11-30T01:28:08.525586Z",
        "id": "861cxmpl96b0",
        "name": "tsv_ann_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "CREATING",
        "storeFormat": "TSV",
        "storeOptions": {
            "tsvStoreOptions": {
                "annotationType": "CHR_START_END_ZERO_BASE",
                "formatToHeader": {
                    "CHR": "chromosome",
                    "END": "end",
                    "START": "start"
                },
                "schema": [
                    {
                        "chromosome": "STRING"
                    },
                    {
                        "start": "LONG"
                    },
                    {
                        "end": "LONG"
                    },
                    {
                        "name": "STRING"
                    }
                ]
            }
        }
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the Amazon Omics Developer Guide.
