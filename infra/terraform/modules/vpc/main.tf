# -------------------------
# VPC
# -------------------------

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = var.name
  }
}

# -------------------------
# Subnets
# -------------------------

resource "aws_subnet" "public_subnets" {
  for_each = toset(var.availability_zones)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 8, index(var.availability_zones, each.key))
  availability_zone       = each.key
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name}-public-${each.key}"
  }
}

resource "aws_subnet" "private_subnets" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr, 8, index(var.availability_zones, each.key) + 10)
  availability_zone = each.key

  tags = {
    Name = "${var.name}-private-${each.key}"
  }
}

# -------------------------
# Internet Gateway
# -------------------------

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.name}-igw"
  }
}

# -------------------------
# Route Tables
# -------------------------

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.this.id
}

resource "aws_route_table_association" "public_associations" {
  for_each = aws_subnet.public_subnets

  route_table_id = aws_route_table.public_rt.id
  subnet_id      = each.value.id
}

resource "aws_route_table_association" "private_associations" {
  for_each = aws_subnet.private_subnets

  route_table_id = aws_route_table.private_rt.id
  subnet_id      = each.value.id
}