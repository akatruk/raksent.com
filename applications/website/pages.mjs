export const services = [
  {
    slug: 'penetration-testing', name: 'Penetration Testing',
    summary: 'Test the controls that protect your applications, APIs, infrastructure and cloud environments.',
    scope: 'Web applications, APIs, authentication and authorization, cloud and network boundaries.',
    results: 'An evidence-backed findings report, a leadership summary, and a prioritized remediation plan.',
  },
  {
    slug: 'vulnerability-assessment', name: 'Vulnerability Assessment',
    summary: 'Identify weaknesses across your assets and prioritize the work that reduces the most risk.',
    scope: 'Asset inventory, exposure review, vulnerability triage and configuration assessment.',
    results: 'A verified findings register with severity, ownership and remediation priorities.',
  },
  {
    slug: 'cloud-security', name: 'Cloud Security',
    summary: 'Review identity, network and data protection across cloud and Kubernetes environments.',
    scope: 'AWS, Azure, Google Cloud, and Kubernetes identity, network boundaries and storage controls.',
    results: 'An architecture review and a prioritized hardening plan tied to your operational constraints.',
  },
  {
    slug: 'devsecops', name: 'DevSecOps',
    summary: 'Integrate security checks into the way your engineering team builds and ships software.',
    scope: 'Build pipelines, dependencies, infrastructure as code, container images and secrets management.',
    results: 'Actionable pipeline changes, policy recommendations and an implementation backlog.',
  },
  {
    slug: 'managed-security-monitoring', name: 'Managed Security Monitoring',
    summary: 'Define which signals matter and give your team a clear path from alert to response.',
    scope: 'Security telemetry, alert coverage, escalation paths, and incident response readiness.',
    results: 'A monitoring and response plan with ownership, escalation criteria and agreed coverage.',
  },
  {
    slug: 'compliance-consulting', name: 'Compliance & Consulting',
    summary: 'Map security controls to business requirements and prepare evidence for independent review.',
    scope: 'Security architecture, risk assessments, ISO 27001 and SOC 2 readiness, NIST CSF and CIS Controls.',
    results: 'A gap analysis and roadmap covering control owners, evidence and delivery priorities.',
  },
];

const publicOrigin = 'https://raksent.com';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function layout({ title, description, path, main, index = true }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | RAKSENT</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}">
<link rel="canonical" href="${publicOrigin}${path}">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/theme.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell bar">
<a class="brand" href="/" aria-label="RAKSENT home"><span class="mark" aria-hidden="true"></span>RAKSENT</a>
<nav aria-label="Main navigation"><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
<button class="theme" type="button" hidden>Switch theme</button>
<a class="button button-small header-cta" href="/request-assessment">Request assessment</a>
</div></header>
<main id="main" tabindex="-1">${main}</main>
<footer class="site-footer"><div class="shell bar"><a class="brand" href="/"><span class="mark" aria-hidden="true"></span>RAKSENT</a><nav aria-label="Footer"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></nav></div></footer>
</body></html>`;
}

function serviceCards() {
  return `<div class="cards">${services.map(service => `
    <article class="card"><h3><a href="/services/${service.slug}">${escapeHtml(service.name)}</a></h3>
    <p>${escapeHtml(service.summary)}</p></article>`).join('')}</div>`;
}

function intro(label, title, copy) {
  return `<section class="shell intro"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lede">${copy}</p></section>`;
}

const pages = new Map([
  ['/', {
    title: 'Security engineering for businesses',
    description: 'Penetration testing, cloud security, DevSecOps and security consulting from RAKSENT.',
    main: `<section class="hero"><div class="shell hero-grid">
    <div><p class="eyebrow">Security engineering &amp; advisory</p><h1>Know where your<br>systems are exposed.</h1>
    <p class="lede">RAKSENT helps engineering and security teams assess risk, harden critical systems and turn findings into a remediation plan.</p>
    <div class="actions"><a class="button" href="/request-assessment">Request an assessment</a><a class="button secondary" href="/services">Explore services</a></div></div>
    <div class="hero-graphic" aria-hidden="true"><div></div><div></div><div></div><div></div><i></i></div>
    </div></section>
    <section class="shell section"><div class="section-heading"><h2>Security services</h2><p>From a focused assessment to ongoing improvements across your infrastructure and delivery pipeline.</p></div>${serviceCards()}</section>
    <section class="engagement"><div class="shell section"><h2>How an engagement works</h2><ol class="steps">
    <li><h3>Agree on scope</h3><p>Define objectives, asset ownership, testing boundaries and contacts before the assessment starts.</p></li>
    <li><h3>Assess and validate</h3><p>Review the agreed systems and prioritize validated findings by their business impact.</p></li>
    <li><h3>Plan remediation</h3><p>Receive a technical report and a leadership summary, with retesting available by agreement.</p></li></ol></div></section>
    <section class="shell section close"><div><h2>What do you need to assess?</h2><p>Tell us which systems and outcomes matter to your team.</p></div><a class="button" href="/request-assessment">Start an inquiry</a></section>`,
  }],
  ['/services', {
    title: 'Security services',
    description: 'Explore assessment, cloud security, DevSecOps, monitoring and compliance services.',
    main: intro('Services', 'Find the right security engagement.', 'Start with a specific concern or a broader review of your security posture.') +
      `<section class="shell section">${serviceCards()}</section>`,
  }],
  ['/about', {
    title: 'About RAKSENT',
    description: 'RAKSENT helps teams assess and improve the security of their systems.',
    main: intro('About', 'Security work your team can act on.', 'RAKSENT works with engineering and security teams on application, infrastructure and cloud security.') +
      `<section class="shell prose"><h2>How we work</h2><p>We agree on scope, access, safety limits and deliverables before work begins. Reporting connects technical findings to business impact and gives engineering teams a prioritized path to remediation.</p><p><a href="/request-assessment">Discuss an engagement</a></p></section>`,
  }],
  ['/contact', {
    title: 'Contact',
    description: 'Contact RAKSENT to discuss a security engagement.',
    main: intro('Contact', 'Let’s discuss your security needs.', 'Share the kind of work you need and the outcome you want to achieve.') +
      `<section class="shell prose"><a class="button" href="/request-assessment">Request an assessment</a></section>`,
  }],
  ['/privacy', {
    title: 'Website privacy notice',
    description: 'How RAKSENT handles information provided through its website inquiry form.',
    main: intro('Privacy', 'Website privacy notice', 'How this website handles contact information and inquiries.') +
      `<section class="shell prose"><h2>Information collected</h2><p>The inquiry form asks for a work contact, organization, service and a short description. We use it to respond to inquiries and discuss potential engagements. Hosting systems may process IP addresses and request metadata for security and operations.</p><h2>Sharing and requests</h2><p>Do not include credentials, personal records or customer evidence in the form. Use the inquiry form to request access to or deletion of information submitted through this site.</p></section>`,
  }],
  ['/terms', {
    title: 'Website terms',
    description: 'Terms for using the RAKSENT website and requesting an assessment.',
    main: intro('Terms', 'Website terms', 'These terms cover the site and its inquiry form.') +
      `<section class="shell prose"><h2>Engagements</h2><p>Submitting an inquiry does not start an engagement or authorize testing. Services begin under a separate written agreement defining scope, permissions and deliverables.</p><h2>Use of the form</h2><p>Provide accurate contact information and describe only systems you are authorized to discuss. Submit credentials or technical evidence only through an agreed secure channel.</p></section>`,
  }],
]);

for (const service of services) {
  pages.set(`/services/${service.slug}`, {
    title: service.name,
    description: service.summary,
    main: intro('Services', escapeHtml(service.name), escapeHtml(service.summary)) +
      `<section class="shell detail section"><div><h2>Typical scope</h2><p>${escapeHtml(service.scope)}</p></div>
      <div><h2>Deliverables</h2><p>${escapeHtml(service.results)}</p></div>
      <a class="button" href="/request-assessment?service=${service.slug}">Discuss this service</a></section>`,
  });
}

export const pagePaths = [...pages.keys(), '/request-assessment'];

export function renderPage(path) {
  const page = pages.get(path);
  if (page) return layout({ ...page, path });
  return null;
}

export function renderForm({ selected = '', error = '', status = '', enabled = true } = {}) {
  const notice = error ? `<p class="notice" role="alert">${escapeHtml(error)}</p>` : '';
  const form = status
    ? `<p class="notice" role="status">${escapeHtml(status)}</p><p><a href="/services">Explore security services</a></p>`
    : enabled ? `${notice}<form method="post" action="/request-assessment">
    <label>Name <input name="name" autocomplete="name" required maxlength="120"></label>
    <label>Work email <input name="email" type="email" autocomplete="email" required maxlength="254"></label>
    <label>Organization <input name="organization" autocomplete="organization" required maxlength="160"></label>
    <label>Service <select name="service" required><option value="">Select a service</option>
    ${services.map(service => `<option value="${service.slug}"${selected === service.slug ? ' selected' : ''}>${escapeHtml(service.name)}</option>`).join('')}
    <option value="other">Help me choose</option></select></label>
    <label class="wide">What would you like to assess? <textarea name="message" rows="5" required minlength="15" maxlength="3000"></textarea></label>
    <label hidden>Website <input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="wide form-note">Please omit credentials, personal records and technical evidence. See our <a href="/privacy">privacy notice</a>.</p>
    <div class="wide"><button class="button" type="submit">Send inquiry</button></div>
    </form>`
    : '<p class="notice" role="status">The inquiry form is currently unavailable.</p>';
  return layout({
    path: '/request-assessment', title: 'Request a security assessment',
    description: 'Request a scoped security assessment for your organization.',
    main: intro('Assessment inquiry', 'Request a security assessment.', 'Tell us about the systems, risks or compliance goals you want to address.') +
      `<section class="shell prose">${form}</section>`,
  });
}

export function renderNotFound() {
  return layout({
    path: '/404', title: 'Page not found', description: 'This page could not be found.', index: false,
    main: intro('404', 'Page not found', 'Return to the <a href="/">RAKSENT home page</a>.'),
  });
}
