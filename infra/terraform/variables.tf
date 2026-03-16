variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "chatcade"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "project_ssm_ps_root_path" {
  type    = string
  default = "/chatcade/prod"
}

variable "image_uri" {
  type = string
}