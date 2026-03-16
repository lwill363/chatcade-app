variable "name" {
  description = "Base name for the RDS instance and related resources"
  type        = string
}
variable "db_name" {
  type = string
}
variable "username" {
  type = string
}
variable "password" {
  type = string
}
variable "vpc_id" {
  type = string
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "allowed_security_group_ids" {
  description = "Security groups allowed to access RDS"
  type        = list(string)
}
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
variable "allocated_storage" {
  type    = number
  default = 20
}