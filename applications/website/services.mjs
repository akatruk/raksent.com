export const serviceGroups = [
  { slug: 'assess', name: 'Assess risk' },
  { slug: 'harden', name: 'Harden systems' },
  { slug: 'operate', name: 'Operate & govern' },
];

export const services = [
  {
    slug: 'penetration-testing',
    group: 'assess',
    name: 'Penetration Testing',
    summary: 'Understand how weaknesses in your applications, APIs and infrastructure affect real business workflows.',
    suitableFor: 'Teams preparing a release, onboarding an enterprise customer or validating the controls around a critical application.',
    scope: [
      'Web applications and APIs, with business-critical user journeys agreed in advance',
      'Authentication, authorization and tenant isolation',
      'Agreed infrastructure, network or cloud boundaries',
    ],
    deliverables: [
      'Executive summary focused on business impact',
      'Validated findings with redacted evidence and remediation guidance',
      'Prioritized engineering backlog, with follow-up retesting by agreement',
    ],
  },
  {
    slug: 'vulnerability-assessment',
    group: 'assess',
    name: 'Vulnerability Assessment',
    summary: 'Identify weaknesses across your assets and prioritize the work that reduces the most exposure.',
    suitableFor: 'Teams that need a baseline across multiple assets, a focused backlog or evidence that remediation priorities are current.',
    scope: [
      'Inventory and exposure review for agreed assets',
      'Configuration and known vulnerability review',
      'Triage by reachability, business criticality and available evidence',
    ],
    deliverables: [
      'Findings register with severity and affected assets',
      'Prioritized remediation plan with proposed owners',
      'Coverage summary showing assessment boundaries',
    ],
  },
  {
    slug: 'cloud-security',
    group: 'harden',
    name: 'Cloud Security',
    summary: 'Review how identities, networks, storage and workloads are protected across cloud and Kubernetes environments.',
    suitableFor: 'Platform teams assessing a new environment, an account migration or security boundaries that have grown across teams.',
    scope: [
      'AWS, Azure, Google Cloud or Kubernetes environments agreed during scoping',
      'Identity, role assignment and workload access',
      'Network segmentation, storage controls and security telemetry',
    ],
    deliverables: [
      'Architecture review with prioritized risks and trade-offs',
      'Hardening plan matched to service dependencies',
      'Acceptance criteria for confirming remediation',
    ],
  },
  {
    slug: 'devsecops',
    group: 'harden',
    name: 'DevSecOps',
    summary: 'Integrate security controls into the build, release and deployment workflows your engineers already use.',
    suitableFor: 'Engineering teams preparing to scale delivery, reduce noisy security checks or improve software supply-chain controls.',
    scope: [
      'Pipeline privileges, secrets handling and approval gates',
      'Dependency, container and infrastructure-as-code validation',
      'Artifact provenance and release controls',
    ],
    deliverables: [
      'Pipeline review with prioritized changes',
      'Proposed policies and conditions for passing or blocking a build',
      'Implementation backlog and verification criteria',
    ],
  },
  {
    slug: 'managed-security-monitoring',
    group: 'operate',
    name: 'Managed Security Monitoring',
    summary: 'Identify the events that matter and give your team a clear path from alert to response.',
    suitableFor: 'Teams establishing monitoring coverage, consolidating alerts or preparing an on-call handoff.',
    scope: [
      'Security telemetry coverage and retention',
      'Alert severity, routing and ownership',
      'Incident response procedures and optional ongoing monitoring with agreed hours',
    ],
    deliverables: [
      'Telemetry coverage map and priority gaps',
      'Escalation matrix and response runbooks',
      'Notification and routing acceptance tests',
    ],
  },
  {
    slug: 'compliance-consulting',
    group: 'operate',
    name: 'Compliance & Consulting',
    summary: 'Map controls to business requirements and prepare evidence for an independent review.',
    suitableFor: 'Teams responding to customer due diligence, planning an external assessment or defining security ownership.',
    scope: [
      'ISO 27001 or SOC 2 readiness, NIST CSF or CIS Controls',
      'Control design, evidence review and ownership',
      'Risk assessment and security architecture review',
    ],
    deliverables: [
      'Gap analysis mapped to the agreed framework',
      'Evidence register and control ownership recommendations',
      'Readiness roadmap for management and engineering',
    ],
  },
];
