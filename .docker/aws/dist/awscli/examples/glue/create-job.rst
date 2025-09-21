**To create a job to transform data**

The following ``create-job`` example creates a streaming job that runs a script stored in S3. ::

    aws glue create-job \
        --name my-testing-job \
        --role AWSGlueServiceRoleDefault \
        --command '{ \
            "Name": "gluestreaming", \
            "ScriptLocation": "s3://amzn-s3-demo-bucket/folder/" \
        }' \
        --region us-east-1 \
        --output json \
        --default-arguments '{ \
            "--job-language":"scala", \
            "--class":"GlueApp" \
        }' \
        --profile my-profile \
        --endpoint https://glue.us-east-1.amazonaws.com 

Contents of ``test_script.scala``::

    import com.amazonaws.services.glue.ChoiceOption
    import com.amazonaws.services.glue.GlueContext
    import com.amazonaws.services.glue.MappingSpec
    import com.amazonaws.services.glue.ResolveSpec
    import com.amazonaws.services.glue.errors.CallSite
    import com.amazonaws.services.glue.util.GlueArgParser
    import com.amazonaws.services.glue.util.Job
    import com.amazonaws.services.glue.util.JsonOptions
    import org.apache.spark.SparkContext
    import scala.collection.JavaConverters._

    object GlueApp {
        def main(sysArgs: Array[String]) {
            val spark: SparkContext = new SparkContext()
            val glueContext: GlueContext = new GlueContext(spark)
            // @params: [JOB_NAME]
            val args = GlueArgParser.getResolvedOptions(sysArgs, Seq("JOB_NAME").toArray)
            Job.init(args("JOB_NAME"), glueContext, args.asJava)
            // @type: DataSource
            // @args: [database = "tempdb", table_name = "s3-source", transformation_ctx = "datasource0"]
            // @return: datasource0
            // @inputs: []
            val datasource0 = glueContext.getCatalogSource(database = "tempdb", tableName = "s3-source", redshiftTmpDir = "", transformationContext = "datasource0").getDynamicFrame()
            // @type: ApplyMapping
            // @args: [mapping = [("sensorid", "int", "sensorid", "int"), ("currenttemperature", "int", "currenttemperature", "int"), ("status", "string", "status", "string")], transformation_ctx = "applymapping1"]
            // @return: applymapping1
            // @inputs: [frame = datasource0]
            val applymapping1 = datasource0.applyMapping(mappings = Seq(("sensorid", "int", "sensorid", "int"), ("currenttemperature", "int", "currenttemperature", "int"), ("status", "string", "status", "string")), caseSensitive = false, transformationContext = "applymapping1")
            // @type: SelectFields
            // @args: [paths = ["sensorid", "currenttemperature", "status"], transformation_ctx = "selectfields2"]
            // @return: selectfields2
            // @inputs: [frame = applymapping1]
            val selectfields2 = applymapping1.selectFields(paths = Seq("sensorid", "currenttemperature", "status"), transformationContext = "selectfields2")
            // @type: ResolveChoice
            // @args: [choice = "MATCH_CATALOG", database = "tempdb", table_name = "my-s3-sink", transformation_ctx = "resolvechoice3"]
            // @return: resolvechoice3
            // @inputs: [frame = selectfields2]
            val resolvechoice3 = selectfields2.resolveChoice(choiceOption = Some(ChoiceOption("MATCH_CATALOG")), database = Some("tempdb"), tableName = Some("my-s3-sink"), transformationContext = "resolvechoice3")
            // @type: DataSink
            // @args: [database = "tempdb", table_name = "my-s3-sink", transformation_ctx = "datasink4"]
            // @return: datasink4
            // @inputs: [frame = resolvechoice3]
            val datasink4 = glueContext.getCatalogSink(database = "tempdb", tableName = "my-s3-sink", redshiftTmpDir = "", transformationContext = "datasink4").writeDynamicFrame(resolvechoice3)
            Job.commit()
        }
    }

Output::

    {
        "Name": "my-testing-job"
    }

For more information, see `Authoring Jobs in AWS Glue <https://docs.aws.amazon.com/glue/latest/dg/author-job.html>`__ in the *AWS Glue Developer Guide*.
