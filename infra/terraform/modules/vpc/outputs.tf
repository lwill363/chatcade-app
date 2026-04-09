output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "private_subnet_ids" {
  value = values(aws_subnet.private_subnets)[*].id
}

output "public_subnet_ids" {
  value = values(aws_subnet.public_subnets)[*].id
}
