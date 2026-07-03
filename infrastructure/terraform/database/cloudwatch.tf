#######################################################
################# Alarms ##############################
#######################################################

resource "aws_cloudwatch_metric_alarm" "DatabaseCpu" {
  alarm_name          = "${var.app}-${var.env}-database-cpu"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.Database.identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "DatabaseStorage" {
  alarm_name          = "${var.app}-${var.env}-database-storage"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  threshold           = 2000000000 # 2 GB
  comparison_operator = "LessThanThreshold"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.Database.identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "DatabaseConnections" {
  alarm_name          = "${var.app}-${var.env}-database-connections"
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.Database.identifier
  }
}
