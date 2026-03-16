terraform {
  backend "s3" {
    bucket       = "chatcade-tf-state-us-east-1-bucket"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}