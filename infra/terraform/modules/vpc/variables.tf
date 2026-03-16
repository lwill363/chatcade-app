variable "name" {
  type = string
}
variable "cidr" {
  type = string
}
variable "availability_zones" {
  type = list(string)

  validation {
    condition     = length(var.availability_zones) == 3
    error_message = "Exactly 3 availability zones must be provided."
  }
}