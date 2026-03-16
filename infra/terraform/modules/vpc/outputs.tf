output "vpc_id" {
  value = aws_vpc.this.id
}

output "private_subnet_ids" {
  value = values(aws_subnet.private_subnets)[*].id
}

output "public_subnet_ids" {
  value = values(aws_subnet.public_subnets)[*].id
}
