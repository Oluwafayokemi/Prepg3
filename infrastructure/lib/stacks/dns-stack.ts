import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

interface DnsStackProps extends cdk.StackProps {
  domainName: string;
}

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: certificatemanager.Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Create or lookup hosted zone
    this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: props.domainName,
      comment: 'PREPG3 Platform Hosted Zone',
    });

    // Create wildcard SSL certificate (covers all subdomains)
    this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [
        `*.${props.domainName}`, // Wildcard for all subdomains
        `www.${props.domainName}`,
      ],
      validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
    });

    // Outputs
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      exportName: 'PREPG3-HostedZoneId',
      description: 'Route 53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', this.hostedZone.hostedZoneNameServers || []),
      description: 'Update these nameservers at your domain registrar',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      exportName: 'PREPG3-CertificateArn',
      description: 'SSL Certificate ARN',
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: props.domainName,
      description: 'Primary domain name',
    });
  }
}