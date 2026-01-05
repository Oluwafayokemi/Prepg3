cd ../infrastructure

# Clean up
aws logs delete-log-group \
  --log-group-name /aws/lambda/prepg3-get-dashboard-live \
  --region eu-north-1 2>/dev/null || true

# Wait for rollback
echo "Waiting for rollback..."
sleep 60

# Build
npm run build

# Deploy
cdk deploy PREPG3-live-API PREPG3-live-Lambdas --context environment=live --region eu-north-1