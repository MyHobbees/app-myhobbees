#######################################################
################# Database (RDS) ######################
#######################################################

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "Database" {
  name   = "${var.app}-${var.env}-database"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_parameter_group" "Database" {
  name   = "${var.app}-${var.env}-database"
  family = "postgres18"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_subnet_group" "Database" {
  name       = "${var.app}-${var.env}-database"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "Database" {
  identifier        = "${var.app}-${var.env}-database"
  engine            = "postgres"
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  db_name  = "${replace(var.app, "-", "_")}_${var.env}"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.Database.name
  vpc_security_group_ids = [aws_security_group.Database.id]
  parameter_group_name   = aws_db_parameter_group.Database.name

  publicly_accessible       = true
  skip_final_snapshot       = !var.db_deletion_protection
  final_snapshot_identifier = "${var.app}-${var.env}-database-final"
  deletion_protection       = var.db_deletion_protection
  backup_retention_period   = var.db_backup_retention
}

output "db_host" {
  value = aws_db_instance.Database.address
}

output "db_name" {
  value = aws_db_instance.Database.db_name
}
