import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { serviceGroups, services } from './services.mjs';

export const publicOrigin = 'https://raksent.com';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function assetUrl(file) {
  const digest = createHash('sha256').update(readFileSync(new URL(`./public/${file}`, import.meta.url))).digest('hex');
  return `/assets/${file}?v=${digest.slice(0, 12)}`;
}

const stylesheet = assetUrl('site.css');
const themeScript = assetUrl('theme.js');
const siteScript = assetUrl('site.js');

const assessmentPath = '/request-assessment';
const assessmentLabel = 'Request an assessment';
const groupName = slug => serviceGroups.find(group => group.slug === slug).name;

function button(label, href, variant = '') {
  return `<a class="button${variant ? ` ${variant}` : ''}" href="${href}">${label}</a>`;
}

function brand(label = '') {
  return `<a class="brand" href="/"${label ? ` aria-label="${label}"` : ''}><span class="mark" aria-hidden="true"></span>RAKSENT</a>`;
}

function icon(paths, name = '') {
  return `<svg class="icon${name ? ` ${name}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const serviceIcons = {
  'penetration-testing': '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  'vulnerability-assessment': '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7.5 12h9"/>',
  'cloud-security': '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5a4 4 0 0 1-.5 8Z"/><path d="m9.5 14 2 2 3.5-3.5"/>',
  devsecops: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 4 4v5.5M6 8.5V14a4 4 0 0 0 4 4h5.5"/>',
  'managed-security-monitoring': '<path d="M3 12h4l2.5-6.5 5 13 2.5-6.5H21"/>',
  'compliance-consulting': '<path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
};

const themeIcons = icon('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>', 'icon-sun') +
  icon('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>', 'icon-moon');

function layout({ title, description, path, main, index = true, canonical = true, cta = assessmentPath }) {
  const titleHtml = escapeHtml(title);
  const descriptionHtml = escapeHtml(description);
  const url = publicOrigin + path;
  const links = [
    ['/services', 'Services', path === '/services' || path.startsWith('/services/')],
    ['/methodology', 'How we work', path === '/methodology'],
    ['/about', 'About', path === '/about'],
    ['/contact', 'Contact', path === '/contact'],
  ].map(([href, label, current]) => `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const ctaCurrent = cta.startsWith('#') ? ' aria-current="page"' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleHtml} | RAKSENT</title>
<meta name="description" content="${descriptionHtml}">
<meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}">
<meta name="theme-color" content="#0b0d10">
<meta property="og:type" content="website">
<meta property="og:site_name" content="RAKSENT">
<meta property="og:title" content="${titleHtml} | RAKSENT">
<meta property="og:description" content="${descriptionHtml}">
${canonical ? `<meta property="og:url" content="${url}">\n` : ''}<meta property="og:image" content="${publicOrigin}/assets/perimeter.jpg">
<meta name="twitter:card" content="summary_large_image">
${canonical ? `<link rel="canonical" href="${url}">\n` : ''}<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">
<script src="${themeScript}"></script>
<link rel="stylesheet" href="${stylesheet}">
<script src="${siteScript}" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell bar">
${brand('RAKSENT home')}
<nav class="site-nav" aria-label="Main navigation">${links}</nav>
<div class="header-actions">
<button class="theme" type="button" aria-label="Switch theme">${themeIcons}</button>
<a class="button button-small header-cta" href="${cta}"${ctaCurrent}>${assessmentLabel}</a>
<details class="menu"><summary aria-label="Menu"><span class="menu-icon" aria-hidden="true"></span></summary>
<div class="menu-panel"><nav aria-label="Menu">${links}</nav><a class="button button-arrow" href="${cta}"${ctaCurrent}>${assessmentLabel}</a></div>
</details>
</div>
</div></header>
<main id="main" tabindex="-1">${main}</main>
<footer class="site-footer">
<div class="shell footer-grid">
<div class="footer-brand">${brand()}<p>Security assessments, cloud security and DevSecOps for engineering and security teams.</p></div>
<nav class="footer-nav" aria-label="Footer">
<div><p class="footer-title">Services</p><a href="/services">All services</a>${serviceGroups.map(group => `<a href="/services?group=${group.slug}">${escapeHtml(group.name)}</a>`).join('')}</div>
<div><p class="footer-title">Company</p><a href="/methodology">How we work</a><a href="/about">About</a><a href="/contact">Contact</a></div>
<div><p class="footer-title">Legal</p><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
</nav>
</div>
<div class="shell footer-base"><p>© ${new Date().getFullYear()} RAKSENT</p><a class="text-link" href="${cta}"${ctaCurrent}>${assessmentLabel}</a></div>
</footer>
</body></html>`;
}

function serviceCards(items = services) {
  return `<div class="cards">${items.map(service => `
    <article class="card">
      <span class="card-icon">${icon(serviceIcons[service.slug])}</span>
      <p class="category">${escapeHtml(groupName(service.group))}</p>
      <h3><a class="card-link" href="/services/${service.slug}">${escapeHtml(service.name)}</a></h3>
      <p class="card-summary">${escapeHtml(service.summary)}</p>
      <span class="card-action" aria-hidden="true">View service</span>
    </article>`).join('')}</div>`;
}

function intro(label, title, copy) {
  return `<section class="page-intro"><div class="shell intro">
    ${label ? `<p class="eyebrow">${label}</p>` : ''}<h1>${title}</h1><p class="lede">${copy}</p>
  </div></section>`;
}

function callout(title, copy, href = assessmentPath) {
  return `<section class="shell section"><div class="callout">
    <div><p class="eyebrow">Get started</p><h2>${title}</h2><p>${copy}</p></div>${button(assessmentLabel, href, 'button-arrow')}
  </div></section>`;
}

const processSteps = [
  ['Scope the engagement', 'Agree on objectives, systems in scope, authorizations, test windows and contacts.'],
  ['Assess and validate', 'Review the agreed systems and tie verified findings to their operational and business impact.'],
  ['Plan remediation', 'Review findings with your team, agree priorities and define any follow-up retesting.'],
];

function steps() {
  return `<ol class="steps">${processSteps.map(([title, copy]) => `<li><h3>${title}</h3><p>${copy}</p></li>`).join('')}</ol>`;
}

const assurances = [
  'Written authorization before testing',
  'Validated findings with redacted evidence',
  'Retesting by agreement',
];

const faqItems = [
  ['What do we need before an assessment?', 'An owner for the systems in scope, a primary contact and an initial description of your goals. Access, authorization and test windows are agreed during scoping.'],
  ['Can you review a production environment?', 'Production work depends on the approved scope, operational constraints and safe test windows. We agree on exclusions, escalation contacts and stop conditions in writing.'],
  ['What will our team receive?', 'The agreed deliverables may include an executive summary, validated findings, redacted evidence and a remediation plan. We define format and acceptance criteria before work begins.'],
  ['How do we arrange a retest?', 'Share the remediation status with your engagement contact. We agree on which findings to verify and record the verification outcome against the original finding.'],
];

function faq() {
  return `<div class="faq">${faqItems.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</div>`;
}

const pages = new Map([
  ['/', {
    title: 'Security engineering and advisory',
    description: 'Security assessments, cloud and Kubernetes security, DevSecOps and security advisory for engineering teams.',
    main: `<section class="hero"><div class="shell hero-grid">
      <div class="hero-copy">
        <p class="eyebrow eyebrow-pill"><span class="pulse" aria-hidden="true"></span>Security assessments &amp; engineering</p>
        <h1>Find your exposure. <span class="gradient-text">Know what to fix.</span></h1>
        <p class="lede">RAKSENT assesses applications, cloud infrastructure and delivery pipelines. Get validated findings and a prioritized remediation plan your engineering team can act on.</p>
        <div class="actions">${button(assessmentLabel, assessmentPath, 'button-arrow')}${button('Explore services', '/services', 'secondary')}</div>
        <ul class="assurances">${assurances.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="hero-visual"><img src="/assets/perimeter.jpg" alt="" fetchpriority="high" decoding="async" width="1200" height="800"><span class="scan" aria-hidden="true"></span></div>
    </div></section>
    <section class="shell section" aria-labelledby="services-title">
      <div class="section-heading"><div><p class="eyebrow">Services</p><h2 id="services-title">Security services</h2></div><p>Choose the engagement that fits the systems you need to assess, harden or operate.</p></div>
      ${serviceCards()}
    </section>
    <section class="process" aria-labelledby="process-title"><div class="shell section">
      <div class="section-heading"><div><p class="eyebrow">Process</p><h2 id="process-title">From scope to remediation</h2></div><a class="text-link" href="/methodology">How we work</a></div>
      ${steps()}
    </div></section>
    ${callout('What do you need to assess?', 'Share your objectives and any constraints or deadlines that matter to your team.')}`,
  }],
  ['/methodology', {
    title: 'How a security assessment works',
    description: 'Learn how RAKSENT scopes security engagements, validates findings and supports remediation.',
    main: intro('Methodology', 'From scope to remediation', 'Every engagement starts with written authorization and ends with findings your team can act on.') +
      `<section class="shell section" aria-label="Engagement steps">${steps()}</section>
      <section class="shell split section"><div><p class="eyebrow">Reporting</p><h2>What you’ll receive</h2></div>
      <div><p>An executive summary explains business impact and priorities. The technical report gives engineering teams the scope, validated findings, redacted evidence and proposed fixes. Retesting and secure delivery are agreed before work starts.</p></div></section>
      <section class="shell split section"><div><p class="eyebrow">FAQ</p><h2>Before you start</h2></div>${faq()}</section>
      ${callout('Discuss an engagement', 'Share the objective and constraints you already know.')}`,
  }],
  ['/about', {
    title: 'About RAKSENT',
    description: 'Learn how RAKSENT works with engineering and security teams on application, cloud and infrastructure security.',
    main: intro('About RAKSENT', 'Security work your team can act on', 'We work with engineering and security teams on application, infrastructure and cloud security.') +
      `<section class="shell split section"><div><p class="eyebrow">Approach</p><h2>How we work</h2></div><div><p>We agree on scope, access, safety limits and deliverables before each engagement. Our reporting connects technical findings to business impact and provides a prioritized path to remediation.</p><a class="text-link" href="/methodology">Read about our engagement process</a></div></section>
      ${callout('Talk to us about your systems', 'Tell us what you operate and which risks you want to understand.')}`,
  }],
  ['/contact', {
    title: 'Contact',
    description: 'Contact RAKSENT to discuss a security engagement.',
    main: intro('Contact', 'Let’s discuss your security needs', 'Send an inquiry with your objectives, timeline and the systems you’re authorized to discuss.') +
      `<section class="shell split section"><div><p class="eyebrow">New engagements</p><h2>Start an inquiry</h2><p>Use the assessment form for new engagements and related questions.</p></div><div><p>If an engagement is already underway, use the secure channel agreed with your project contact.</p>${button(assessmentLabel, assessmentPath, 'button-arrow')}</div></section>`,
  }],
  ['/privacy', {
    title: 'Website privacy notice',
    description: 'How RAKSENT handles information provided through its website inquiry form.',
    main: intro('Privacy', 'Website privacy notice', 'How this website handles contact information and inquiries.') +
      `<section class="shell prose"><h2>Information collected</h2><p>The inquiry form asks for a work contact, organization, service and a short description. We use it to respond to inquiries and discuss potential engagements. Hosting systems may process IP addresses and request metadata for security and operations.</p><h2>Sharing and requests</h2><p>Please omit credentials, personal records and technical evidence. Use the <a href="/request-assessment">inquiry form</a> to request access to or deletion of information submitted through this site.</p></section>`,
  }],
  ['/terms', {
    title: 'Website terms',
    description: 'Terms for using the RAKSENT website and requesting an assessment.',
    main: intro('Terms', 'Website terms', 'These terms cover the site and its inquiry form.') +
      `<section class="shell prose"><h2>Engagements</h2><p>Submitting an inquiry does not start an engagement or authorize testing. Services begin under a separate written agreement defining scope, permissions and deliverables.</p><h2>Use of the form</h2><p>Provide accurate contact information and describe only systems you are authorized to discuss. Submit credentials or technical evidence through an agreed secure channel.</p></section>`,
  }],
]);

function list(items) {
  return `<ul class="check-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

const inquirySteps = [
  ['Share your objectives', 'Tell us what you want to assess and what you need to learn.'],
  ['Discuss scope and approvals', 'We discuss the systems in scope, timeline and required authorizations.'],
  ['Agree on deliverables', 'We define what you will receive and the conditions for starting work.'],
];

function inquiryTimeline() {
  return `<ol class="timeline">${inquirySteps.map(([title, copy]) => `
    <li><strong>${title}</strong><p>${copy}</p></li>`).join('')}</ol>`;
}

for (const service of services) {
  const inquiryPath = `${assessmentPath}?service=${service.slug}`;
  pages.set(`/services/${service.slug}`, {
    title: service.name,
    description: service.summary,
    main: `<section class="page-intro"><div class="shell intro service-intro">
      <div><nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/services">Security services</a></li><li><a href="/services?group=${service.group}">${escapeHtml(groupName(service.group))}</a></li></ol></nav>
      <span class="service-icon">${icon(serviceIcons[service.slug])}</span>
      <h1>${escapeHtml(service.name)}</h1><p class="lede">${escapeHtml(service.summary)}</p>
      <div class="actions">${button(assessmentLabel, inquiryPath, 'button-arrow')}</div></div>
      <aside class="fit-panel" aria-labelledby="fit-title"><h2 id="fit-title">When to consider it</h2>
      <p>${escapeHtml(service.suitableFor)}</p></aside>
    </div></section>
    <section class="shell section service-detail" aria-label="Scope and deliverables">
      <div class="detail-card"><h2>What we cover</h2>${list(service.scope)}</div>
      <div class="detail-card"><h2>What you receive</h2>${list(service.deliverables)}</div>
    </section>
    <section class="process" aria-labelledby="next-title"><div class="shell section split">
      <div><p class="eyebrow">Next steps</p><h2 id="next-title">After you request an assessment</h2><a class="text-link" href="/methodology">How we work</a></div>
      ${inquiryTimeline()}
    </div></section>
    ${callout('Discuss this service', 'Tell us which systems and outcomes you want to cover.', inquiryPath)}`,
  });
}

export const pagePaths = [...pages.keys(), '/services', '/request-assessment'];

export function renderPage(path, { group } = {}) {
  if (path === '/services') {
    const selected = serviceGroups.find(item => item.slug === group);
    const groups = [{ name: 'All services', slug: '' }, ...serviceGroups];
    const nav = `<nav class="filters" aria-label="Filter services">${groups.map(item => {
      const href = item.slug ? `/services?group=${item.slug}` : '/services';
      const current = item.slug === (selected?.slug || '');
      return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${escapeHtml(item.name)}</a>`;
    }).join('')}</nav>`;
    return layout({
      path, title: 'Security services',
      description: 'Explore assessment, cloud security, DevSecOps, monitoring and compliance services.',
      main: intro('Services', 'Security services', 'Find an engagement for the systems you run and the outcomes you need.') +
        `<section class="shell section catalog">${nav}${serviceCards(selected ? services.filter(service => service.group === selected.slug) : services)}</section>`,
    });
  }
  const page = pages.get(path);
  return page ? layout({ ...page, path }) : null;
}

const fieldLabels = {
  name: 'Name',
  email: 'Work email',
  organization: 'Organization',
  service: 'Service',
  message: 'What would you like to assess?',
};

export function renderForm({ values = {}, errors = {}, error = '', receipt = '', enabled = true } = {}) {
  if (receipt) {
    return layout({
      path: assessmentPath, title: 'Inquiry received',
      description: 'Confirmation for your RAKSENT security assessment inquiry.',
      index: false,
      main: `<section class="shell section receipt-layout">
        <div class="receipt-panel">
          <span class="success-mark" aria-hidden="true"></span>
          <p class="eyebrow">Assessment inquiry</p><h1>Inquiry received</h1>
          <p class="lede">Your inquiry was saved. Keep this reference for your records.</p>
          <dl class="receipt-reference"><dt>Inquiry reference</dt><dd><code>${escapeHtml(receipt)}</code></dd></dl>
          ${button('Explore security services', '/services', 'secondary')}
        </div>
      </section>`,
    });
  }

  const invalidFields = Object.keys(fieldLabels).filter(name => errors[name]);
  const notice = error ? `<p class="notice notice-error" role="alert">${escapeHtml(error)}</p>` : '';
  const summary = invalidFields.length ? `<div class="notice notice-error" role="alert">
    <p>Check the highlighted fields and try again.</p>
    <ul>${invalidFields.map(name => `<li><a href="#${name}">${fieldLabels[name]}</a></li>`).join('')}</ul>
  </div>` : '';
  const errorText = name => errors[name] ? `<span class="field-error" id="${name}-error">${escapeHtml(errors[name])}</span>` : '';
  const errorAttrs = name => errors[name] ? ` aria-invalid="true" aria-describedby="${name}-error"` : '';
  const input = (name, autocomplete, max, type = 'text') => `<label for="${name}">${fieldLabels[name]}
    <input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required maxlength="${max}" value="${escapeHtml(values[name] || '')}"${errorAttrs(name)}>
    ${errorText(name)}</label>`;

  const form = enabled ? `<div class="form-panel">
    <h2>Your assessment inquiry</h2><p class="form-instruction">All fields are required.</p>
    ${notice}${summary}
    <form method="post" action="${assessmentPath}">
      ${input('name', 'name', 120)}
      ${input('email', 'email', 254, 'email')}
      ${input('organization', 'organization', 160)}
      <label for="service">${fieldLabels.service} <select id="service" name="service" required${errorAttrs('service')}><option value="">Select a service</option>
      ${services.map(service => `<option value="${service.slug}"${values.service === service.slug ? ' selected' : ''}>${escapeHtml(service.name)}</option>`).join('')}
      <option value="other"${values.service === 'other' ? ' selected' : ''}>Help me choose</option></select>${errorText('service')}</label>
      <label class="wide" for="message">${fieldLabels.message} <textarea id="message" name="message" rows="5" required minlength="15" maxlength="3000"${errorAttrs('message')}>${escapeHtml(values.message || '')}</textarea>${errorText('message')}</label>
      <label hidden>Website <input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="wide form-note">Please omit credentials, customer data and technical evidence. Read our <a href="/privacy">privacy notice</a>.</p>
      <div class="wide"><button class="button button-arrow" type="submit">Send inquiry</button></div>
    </form>
    </div>` : notice || '<p class="notice" role="status">The inquiry form is currently unavailable.</p>';

  return layout({
    path: assessmentPath, title: 'Request a security assessment',
    description: 'Request a scoped security assessment for your organization.',
    cta: '#inquiry',
    main: intro('Contact', assessmentLabel, 'Tell us which systems you operate and what you want to learn from the assessment.') +
      `<section class="shell section form-layout" id="inquiry">${form}<aside class="form-aside" aria-labelledby="form-next"><h2 id="form-next">What happens next?</h2>${inquiryTimeline()}</aside></section>`,
  });
}

export function renderNotFound() {
  return layout({
    path: '/404', title: 'Page not found', description: 'This page could not be found.', index: false, canonical: false,
    main: intro('404', 'Page not found', 'This page may have moved or the address may be incorrect.') +
      `<section class="shell section"><div class="actions">${button('Return to the home page', '/', 'secondary')}${button('Explore services', '/services', 'secondary')}</div></section>`,
  });
}
