// infrastructure/lib/stacks/storage-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { SecureBucket } from '../constructs/secure-bucket';
import { DOMAINS } from '../config/constants';

interface StorageStackProps extends cdk.StackProps {
  environmentName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly buckets: {
    documents: s3.Bucket;
    images: s3.Bucket;
    backups: s3.Bucket;
  };

  public readonly distributions: {
    images: cdk.aws_cloudfront.Distribution;
  };

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const isProd = props.environmentName === 'prod';

    // Documents Bucket (Private)
    const documentsBucket = new SecureBucket(this, 'Documents', {
      bucketName: 'documents',
      environmentName: props.environmentName,
      publicAccess: false,
      versioned: true,
      corsRules: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: isProd
            ? [DOMAINS.PRODUCTION.INVESTOR, DOMAINS.PRODUCTION.ADMIN]
            : [DOMAINS.DEVELOPMENT.INVESTOR, DOMAINS.DEVELOPMENT.ADMIN],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // Add Glacier transition for old documents (production only)
    if (isProd) {
      documentsBucket.addGlacierTransition(30);
    }

    // Images Bucket (Public via CloudFront)
    const imagesBucket = new SecureBucket(this, 'Images', {
      bucketName: 'images',
      environmentName: props.environmentName,
      publicAccess: true, // Creates CloudFront automatically
      versioned: false,
      corsRules: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // Delete old thumbnails after 30 days
    imagesBucket.addExpirationRule(30, 'thumbnails/');

    // Backups Bucket (Long-term storage)
    const backupsBucket = new SecureBucket(this, 'Backups', {
      bucketName: 'backups',
      environmentName: props.environmentName,
      publicAccess: false,
      versioned: false,
      autoDeleteObjects: false, // Never auto-delete backups
    });

    // Transition backups to Glacier after 30 days
    backupsBucket.addGlacierTransition(30);

    // Delete very old backups after 90 days
    backupsBucket.addExpirationRule(90);

    // Export buckets
    this.buckets = {
      documents: documentsBucket.bucket,
      images: imagesBucket.bucket,
      backups: backupsBucket.bucket,
    };

    this.distributions = {
      images: imagesBucket.distribution!,
    };

    // Stack summary output
    new cdk.CfnOutput(this, 'StorageSummary', {
      value: JSON.stringify({
        buckets: 3,
        distributions: 1,
        totalStorage: 'Pay-as-you-go',
      }),
      description: 'Storage stack summary',
    });
  }
}