# -------------------------
# Subnet Group (for RDS to use private subnets)
# -------------------------

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.name}-subnet-group"
  }
}

# -------------------------
# Security Group for RDS
# Allows allowed SGs to connect
# -------------------------

resource "aws_security_group" "this" {
  name        = "rds-security-group"
  description = "Allow allowed security groups access to RDS"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres access from allowed security groups"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }


}

# -------------------------
# RDS Instance
# -------------------------

resource "aws_db_instance" "this" {
  identifier        = var.name
  db_name           = var.db_name
  engine            = "postgres"
  engine_version    = "17.7"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  username          = var.username
  password          = var.password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]

  multi_az            = false
  publicly_accessible = false
  storage_encrypted   = true
  skip_final_snapshot = true

  backup_retention_period = 7
  backup_window           = "03:00-06:00"

  deletion_protection = true

  tags = {
    Name = var.name
  }
}