#######################################################
################# Autostop Lambda (stg only) ##########
#######################################################

# Stops the stg RDS instance after 30 minutes with no connection, so
# nobody has to remember to turn it back off after using the prd
# back-office's "start staging" control. Never calls DeleteDBInstance.
# See aidd_docs/memory/infra.md.

data "archive_file" "AutostopPlaceholder" {
  count = var.env == "stg" ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/tmp/autostop.zip"

  source {
    filename = "lambda_function.py"
    content  = <<-PYEOF
      import os
      from datetime import datetime, timedelta, timezone

      import boto3


      def lambda_handler(event, context):
          db_instance_id = os.environ["DB_INSTANCE_ID"]

          cloudwatch = boto3.client("cloudwatch")
          rds = boto3.client("rds")

          now = datetime.now(timezone.utc)
          metrics = cloudwatch.get_metric_statistics(
              Namespace="AWS/RDS",
              MetricName="DatabaseConnections",
              Dimensions=[{"Name": "DBInstanceIdentifier", "Value": db_instance_id}],
              StartTime=now - timedelta(minutes=30),
              EndTime=now,
              Period=1800,
              Statistics=["Maximum"],
          )
          datapoints = metrics.get("Datapoints", [])
          if not datapoints:
              # No datapoints yet is not the same as "idle": right after a
              # start, CloudWatch hasn't populated DatabaseConnections for
              # this window yet. Treat that as unknown and never stop.
              return {"stopped": False, "reason": "no datapoints yet, not enough data"}

          all_idle = all(point["Maximum"] == 0 for point in datapoints)
          if not all_idle:
              return {"stopped": False, "reason": "connection seen in the last 30 minutes"}

          describe = rds.describe_db_instances(DBInstanceIdentifier=db_instance_id)
          instances = describe.get("DBInstances", [])
          if not instances or instances[0]["DBInstanceStatus"] != "available":
              return {"stopped": False, "reason": "instance not available"}

          rds.stop_db_instance(DBInstanceIdentifier=db_instance_id)
          return {"stopped": True}
    PYEOF
  }
}

resource "aws_iam_role" "AutostopLambda" {
  count = var.env == "stg" ? 1 : 0

  name = "${var.app}-${var.env}-autostop-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "AutostopLambdaBasicExecution" {
  count = var.env == "stg" ? 1 : 0

  role       = aws_iam_role.AutostopLambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "AutostopLambda" {
  count = var.env == "stg" ? 1 : 0

  name = "${var.app}-${var.env}-autostop-lambda"
  role = aws_iam_role.AutostopLambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:StopDBInstance",
        ]
        Resource = aws_db_instance.Database.arn
      },
      {
        # CloudWatch metric reads are not resource-scopable, so this one
        # action stays unscoped by necessity.
        Effect   = "Allow"
        Action   = "cloudwatch:GetMetricStatistics"
        Resource = "*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "Autostop" {
  count = var.env == "stg" ? 1 : 0

  name              = "/aws/lambda/${var.app}-${var.env}-autostop"
  retention_in_days = 7
}

resource "aws_lambda_function" "Autostop" {
  count = var.env == "stg" ? 1 : 0

  function_name = "${var.app}-${var.env}-autostop"
  role          = aws_iam_role.AutostopLambda[0].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.14"
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.AutostopPlaceholder[0].output_path
  source_code_hash = data.archive_file.AutostopPlaceholder[0].output_base64sha256

  environment {
    variables = {
      DB_INSTANCE_ID = aws_db_instance.Database.identifier
    }
  }

  depends_on = [aws_cloudwatch_log_group.Autostop]
}

resource "aws_cloudwatch_event_rule" "Autostop" {
  count = var.env == "stg" ? 1 : 0

  name                = "${var.app}-${var.env}-autostop"
  schedule_expression = "rate(10 minutes)"
}

resource "aws_cloudwatch_event_target" "Autostop" {
  count = var.env == "stg" ? 1 : 0

  rule = aws_cloudwatch_event_rule.Autostop[0].name
  arn  = aws_lambda_function.Autostop[0].arn
}

resource "aws_lambda_permission" "AutostopEventBridge" {
  count = var.env == "stg" ? 1 : 0

  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.Autostop[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.Autostop[0].arn
}
