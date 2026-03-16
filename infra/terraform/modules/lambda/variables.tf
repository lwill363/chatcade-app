variable "name" {
  type = string
}
variable "filename" {
  type = string
}
variable "timeout" {
  type = number
}
variable "memory_size" {
  type = number
}
variable "environment" {
  type    = map(string)
  default = {}
}
variable "vpc_id" {
  type = string
}
variable "subnet_ids" {
  type = list(string)
}