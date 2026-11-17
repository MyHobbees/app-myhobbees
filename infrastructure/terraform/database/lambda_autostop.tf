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

      WINDOW_SECONDS = 1800
      PERIOD_SECONDS = 60
      EXPECTED_DATAPOINTS = WINDOW_SECONDS // PERIOD_SECONDS
      MIN_DATAPOINTS = EXPECTED_DATAPOINTS - 2


      def decide(datapoints, status):
          # RDS reports a live DatabaseConnections=0 datapoint within ~60s of
          # reaching "available" -- a single zero datapoint only proves "no
          # connection in the last minute", not "idle for 30 minutes". The
          # only way to tell a freshly started instance apart from a genuinely
          # idle one is datapoint *coverage*: querying Period=60 over the full
          # 1800s window, a confirmed-idle instance has been reporting zeros
          # for the whole window and so returns close to EXPECTED_DATAPOINTS
          # (30) datapoints; an instance that started a few minutes ago has
          # only as many datapoints as minutes elapsed since start, far below
          # that count. Only trust the all-zero verdict once coverage is
          # near-complete (allowing a small tolerance for metric publish
          # delay); anything sparser is "not enough confirmed history yet",
          # exactly like the zero-datapoints case, just generalized.
          if status != "available":
              return False, "instance not available"
          if len(datapoints) < MIN_DATAPOINTS:
              return False, "not enough confirmed idle history yet"
          if not all(point["Maximum"] == 0 for point in datapoints):
              return False, "connection seen in the last 30 minutes"
          return True, "confirmed idle for 30 minutes"


      def lambda_handler(event, context):
          db_instance_id = os.environ["DB_INSTANCE_ID"]

          cloudwatch = boto3.client("cloudwatch")
          rds = boto3.client("rds")

          now = datetime.now(timezone.utc)
          metrics = cloudwatch.get_metric_statistics(
              Namespace="AWS/RDS",
              MetricName="DatabaseConnections",
              Dimensions=[{"Name": "DBInstanceIdentifier", "Value": db_instance_id}],
              StartTime=now - timedelta(seconds=WINDOW_SECONDS),
              EndTime=now,
              Period=PERIOD_SECONDS,
              Statistics=["Maximum"],
          )
          datapoints = metrics.get("Datapoints", [])

          describe = rds.describe_db_instances(DBInstanceIdentifier=db_instance_id)
          instances = describe.get("DBInstances", [])
          status = instances[0]["DBInstanceStatus"] if instances else None

          should_stop, reason = decide(datapoints, status)
          if not should_stop:
              return {"stopped": False, "reason": reason}

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
