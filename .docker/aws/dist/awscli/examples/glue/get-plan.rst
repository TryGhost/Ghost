**To get the generated code for mapping data from source tables to target tables**

The following ``get-plan`` retrieves the generated code for mapping columns from the data source to the data target. ::

    aws glue get-plan --mapping '[ \
        { \
            "SourcePath":"sensorid", \
            "SourceTable":"anything", \
            "SourceType":"int", \
            "TargetPath":"sensorid", \
            "TargetTable":"anything", \
            "TargetType":"int" \
        }, \
        { \
            "SourcePath":"currenttemperature", \
            "SourceTable":"anything", \
            "SourceType":"int", \
            "TargetPath":"currenttemperature", \
            "TargetTable":"anything", \
            "TargetType":"int" \
        }, \
        { \
            "SourcePath":"status", \
            "SourceTable":"anything", \
            "SourceType":"string", \
            "TargetPath":"status", \
            "TargetTable":"anything", \
            "TargetType":"string" \
        }]' \
        --source '{ \
            "DatabaseName":"tempdb", \
            "TableName":"s3-source" \
        }' \
        --sinks '[ \
            { \
                "DatabaseName":"tempdb", \
                "TableName":"my-s3-sink" \
            }]' 
        --language "scala" 
        --endpoint https://glue.us-east-1.amazonaws.com
        --output "text"

Output::

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

For more information, see `Editing Scripts in AWS Glue <https://docs.aws.amazon.com/glue/latest/dg/edit-script.html>`__ in the *AWS Glue Developer Guide*.
