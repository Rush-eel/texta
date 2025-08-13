# AWS Deployment Guide for Texta Backend

## Overview
This guide covers deploying the Texta sentiment analysis backend to AWS using various services.

## Prerequisites
- AWS CLI configured
- Docker installed locally
- Python 3.11+ environment

## Option 1: AWS ECS (Elastic Container Service) - Recommended

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t texta-backend .

# Tag for ECR
docker tag texta-backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/texta-backend:latest

# Login to ECR
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com

# Push to ECR
docker push YOUR_AWS_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/texta-backend:latest
```

### 2. Create ECS Cluster
- Go to ECS Console
- Create cluster (EC2 or Fargate)
- For production: Use Fargate with 4GB memory, 2 vCPU

### 3. Create Task Definition
```json
{
  "family": "texta-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "texta-backend",
      "image": "YOUR_AWS_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/texta-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/texta-backend",
          "awslogs-region": "YOUR_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. Create Service
- Use Application Load Balancer
- Configure health checks on `/health` endpoint
- Set desired count to 1-3 based on traffic

## Option 2: AWS EC2 with Docker

### 1. Launch EC2 Instance
- Use t3.xlarge or larger (4GB+ RAM recommended)
- Ubuntu 22.04 LTS
- Security group: Allow port 8000

### 2. Install Docker
```bash
sudo apt update
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

### 3. Deploy
```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/texta.git
cd texta/backend

# Build and run
docker build -t texta-backend .
docker run -d -p 8000:8000 --name texta-backend texta-backend
```

## Option 3: AWS Lambda + API Gateway (Limited)

**Note:** Not recommended due to ML model size limitations and cold start issues.

## Environment Variables

Set these in your deployment:

```bash
# For production
PYTHONPATH=/app
LOG_LEVEL=info
```

## Monitoring and Logging

### CloudWatch Logs
- ECS: Automatic with awslogs driver
- EC2: Configure rsyslog forwarding

### Health Checks
- Endpoint: `/health`
- Expected response: `{"status": "healthy"}`

## Scaling

### ECS Auto Scaling
- CPU utilization > 70%
- Memory utilization > 80%
- Scale out: +1 task
- Scale in: -1 task (after 5 minutes)

### EC2 Auto Scaling
- Use Application Load Balancer health checks
- Scale based on CPU/memory metrics

## Cost Optimization

- **Development:** t3.medium (2GB RAM)
- **Production:** t3.xlarge (16GB RAM) or Fargate 4GB
- **Reserved Instances** for predictable workloads

## Security

- Use VPC with private subnets
- Security groups: Only allow necessary ports
- IAM roles with minimal permissions
- Enable CloudTrail for audit logging

## Backup and Recovery

- ECR: Automatic image versioning
- ECS: Task definition versioning
- EC2: AMI snapshots
- Data: S3 for model caching (optional)

## Troubleshooting

### Common Issues
1. **Out of Memory:** Increase memory allocation
2. **Model Loading Slow:** Use larger instance types
3. **CORS Issues:** Check security group rules
4. **Health Check Failures:** Verify `/health` endpoint

### Logs
```bash
# ECS
aws logs tail /ecs/texta-backend --follow

# EC2
docker logs texta-backend
```

## Next Steps
1. Choose deployment option
2. Set up AWS infrastructure
3. Deploy backend
4. Update frontend API URL
5. Test end-to-end functionality
