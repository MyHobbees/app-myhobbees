#######################################################
################# Alarms ##############################
#######################################################
# Console-only alarms (no notification): state and history are visible in
# CloudWatch. Add an SNS action later if notifications become needed.

resource "aws_cloudwatch_metric_alarm" "ApiErrors" {
  alarm_name          = "${var.app}-${var.env}-api-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.Api.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "ApiThrottles" {
  alarm_name          = "${var.app}-${var.env}-api-throttles"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.Api.function_name
  }
}
