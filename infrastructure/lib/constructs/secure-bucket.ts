// infrastructure/lib/constructs/secure-bucket.ts
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import {
  S3,
  CLOUDFRONT,
  isProduction,
  getResourceName,
} from "../config/constants";

export interface SecureBucketProps {
  /**
   * Bucket name (will be prefixed)
   */
  bucketName: string;

  /**
   * Environment name
   */
  environmentName: string;

  /**
   * Whether this bucket should be publicly accessible via CloudFront
   */
  publicAccess?: boolean;

  /**
   * Enable versioning
   */
  versioned?: boolean;

  /**
   * CORS configuration
   */
  corsRules?: s3.CorsRule[];

  /**
   * Lifecycle rules
   */
  lifecycleRules?: s3.LifecycleRule[];

  /**
   * Whether to enable auto-delete objects on stack deletion
   * (Only works in non-production)
   */
  autoDeleteObjects?: boolean;
}

/**
 * Reusable construct for secure S3 buckets
 * Includes encryption, versioning, lifecycle rules, and optional CloudFront
 */
export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution?: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    const isLive = isProduction(props.environmentName);
    const bucketName = `${props.bucketName}-${props.environmentName}-${cdk.Aws.ACCOUNT_ID}`;

    // Determine removal policy
    const removalPolicy = isLive
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    // Auto-delete only allowed in non-production
    const autoDeleteObjects = !isLive && (props.autoDeleteObjects ?? true);

    // Default lifecycle rules
    const defaultLifecycleRules: s3.LifecycleRule[] = [
      {
        id: "AbortIncompleteUploads",
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(
          S3.LIFECYCLE_RULES.DELETE_INCOMPLETE_UPLOADS_DAYS
        ),
        enabled: true,
      },
    ];

    if (props.versioned) {
      defaultLifecycleRules.push({
        id: "DeleteOldVersions",
        noncurrentVersionExpiration: cdk.Duration.days(
          S3.LIFECYCLE_RULES.DELETE_OLD_VERSIONS_DAYS
        ),
        enabled: true,
      });
    }

    // Create bucket
    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: props.versioned ?? true,
      enforceSSL: true, // Require HTTPS
      minimumTLSVersion: 1.2,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      cors: props.corsRules,
      lifecycleRules: [
        ...defaultLifecycleRules,
        ...(props.lifecycleRules || []),
      ],
      removalPolicy,
      autoDeleteObjects,
      serverAccessLogsPrefix: isLive ? "access-logs/" : undefined,
      intelligentTieringConfigurations: isLive
        ? [
            {
              name: "IntelligentTiering",
              archiveAccessTierTime: cdk.Duration.days(90),
              deepArchiveAccessTierTime: cdk.Duration.days(180),
            },
          ]
        : undefined,
    });

    // Add tags
    cdk.Tags.of(this.bucket).add("Name", bucketName);
    cdk.Tags.of(this.bucket).add("Environment", props.environmentName);
    cdk.Tags.of(this.bucket).add("Public", props.publicAccess ? "Yes" : "No");

    // Create CloudFront distribution if public access is needed
    if (props.publicAccess) {
      this.distribution = new cloudfront.Distribution(this, "Distribution", {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // EU and US
        enableLogging: false,
        logFilePrefix: 'cloudfront-logs/',
        comment: `${props.bucketName} CDN for ${props.environmentName}`,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      });

      // Output CloudFront URL
      new cdk.CfnOutput(this, "DistributionUrl", {
        value: this.distribution.distributionDomainName,
        exportName: `PREPG3-${props.environmentName}-${props.bucketName}-CDN`,
        description: `CloudFront URL for ${props.bucketName}`,
      });
    }

    // Output bucket name
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      exportName: `PREPG3-${props.environmentName}-${props.bucketName}-Bucket`,
      description: `Bucket name for ${props.bucketName}`,
    });

    // Output bucket ARN
    new cdk.CfnOutput(this, "BucketArn", {
      value: this.bucket.bucketArn,
      exportName: `PREPG3-${props.environmentName}-${props.bucketName}-BucketArn`,
      description: `Bucket ARN for ${props.bucketName}`,
    });
  }

  /**
   * Add a lifecycle rule to transition objects to Glacier
   */
  public addGlacierTransition(days: number): void {
    this.bucket.addLifecycleRule({
      id: "TransitionToGlacier",
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(days),
        },
      ],
      enabled: true,
    });
  }

  /**
   * Add a lifecycle rule to delete objects after X days
   */
  public addExpirationRule(days: number, prefix?: string): void {
    this.bucket.addLifecycleRule({
      id: `DeleteAfter${days}Days${prefix ? `-${prefix}` : ""}`,
      expiration: cdk.Duration.days(days),
      prefix,
      enabled: true,
    });
  }
}
