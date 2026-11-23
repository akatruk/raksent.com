import { serviceGroups, services } from './services.mjs';

export const publicOrigin = 'https://raksent.com';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function layout({ title, description, path, main, index = true }) {
  const titleHtml = escapeHtml(title);
  const descriptionHtml = escapeHtml(description);
  const url = publicOrigin + path;
  const nav = [
    ['/services', 'Services', path === '/services' || path.startsWith('/services/')],
    ['/methodology', 'How we work', path === '/methodology'],
    ['/about', 'About', path === '/about'],
    ['/contact', 'Contact', path === '/contact'],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleHtml} | RAKSENT</title>
<meta name="description" content="${descriptionHtml}">
<meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="RAKSENT">
<meta property="og:title" content="${titleHtml} | RAKSENT">
<meta property="og:description" content="${descriptionHtml}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${publicOrigin}/assets/perimeter.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${url}">
<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/theme.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell bar">
<a class="brand" href="/" aria-label="RAKSENT home"><span class="mark" aria-hidden="true"></span>RAKSENT</a>
<nav aria-label="Main navigation">${nav.map(([href, label, current]) => `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
<div class="header-actions"><button class="theme" type="button" hidden>Switch theme</button>
<a class="button button-small header-cta" href="/request-assessment">Request an assessment</a></div>
</div></header>
<main id="main" tabindex="-1">${main}</main>
<footer class="site-footer"><div class="shell footer-grid">
<div><a class="brand" href="/"><span class="mark" aria-hidden="true"></span>RAKSENT</a><p>Security engineering and advisory.</p></div>
<nav aria-label="Footer"><a href="/services">Services</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
</div></footer>
</body></html>`;
}

function serviceCards(items = services) {
  return `<div class="cards">${items.map(service => `
    <article class="card">
    <p class="category">${escapeHtml(serviceGroups.find(group => group.slug === service.group).name)}</p>
    <h3><a href="/services/${service.slug}">${escapeHtml(service.name)}</a></h3>
    <p>${escapeHtml(service.summary)}</p></article>`).join('')}</div>`;
}

function intro(label, title, copy) {
  return `<section class="shell intro"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lede">${copy}</p></section>`;
}

function callout(title, copy, label = 'Request an assessment', href = '/request-assessment') {
  return `<section class="shell section"><div class="callout">
  <div><h2>${title}</h2><p>${copy}</p></div><a class="button" href="${href}">${label}</a>
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
    <div class="hero-copy"><p class="eyebrow">Security engineering &amp; advisory</p>
    <h1>Know where your systems are exposed<span>.</span></h1>
    <p class="lede">RAKSENT assesses applications, cloud infrastructure and delivery pipelines, then gives your team a clear plan to fix what matters.</p>
    <div class="actions"><a class="button" href="/request-assessment">Request an assessment</a><a class="button secondary" href="/services">Explore services</a></div></div>
    <div class="hero-visual"><img src="/assets/perimeter.jpg" alt="" fetchpriority="high" width="1200" height="800"></div>
    </div></section>
    <section class="shell section" aria-labelledby="services-title"><div class="section-heading"><div><p class="eyebrow">SERVICES</p><h2 id="services-title">Where we can help</h2></div><p>Get a focused assessment or improve the security controls your teams operate every day.</p></div>${serviceCards()}</section>
    <section class="process"><div class="shell section" aria-labelledby="process-title"><div class="section-heading"><div><p class="eyebrow">ENGAGEMENT</p><h2 id="process-title">From scope to remediation</h2></div><a class="text-link" href="/methodology">See how we work</a></div>${steps()}</div></section>
    ${callout('What do you need to assess?', 'Tell us which systems, risks or deadlines matter to your team.')}`,
  }],
  ['/methodology', {
    title: 'How a security assessment works',
    description: 'Learn how RAKSENT scopes security engagements, validates findings and supports remediation.',
    main: intro('Methodology', 'From scope to remediation', 'Every engagement starts with written authorization and ends with findings your team can act on.') +
      `<section class="shell section" aria-label="Engagement steps">${steps()}</section>
      <section class="shell split section"><div><p class="eyebrow">REPORTING</p><h2>What you’ll receive</h2></div>
      <div><p>An executive summary explains business impact and priorities. The technical report gives engineering teams the scope, validated findings, redacted evidence and proposed fixes. Retesting and secure delivery are agreed before work starts.</p></div></section>
      <section class="shell split section"><div><p class="eyebrow">FAQ</p><h2>Before you start</h2></div>${faq()}</section>
      ${callout('Discuss an engagement', 'Share the objective and constraints you already know.')}`,
  }],
  ['/about', {
    title: 'About RAKSENT',
    description: 'Learn how RAKSENT works with engineering and security teams on application, cloud and infrastructure security.',
    main: intro('About RAKSENT', 'Security work your team can act on', 'We work with engineering and security teams on application, infrastructure and cloud security.') +
      `<section class="shell split section"><div><h2>How we work</h2></div><div><p>We agree on scope, access, safety limits and deliverables before each engagement. Our reporting connects technical findings to business impact and provides a prioritized path to remediation.</p><a class="text-link" href="/methodology">Read about our engagement process</a></div></section>
      ${callout('Talk to us about your systems', 'Tell us what you operate and which risks you want to understand.')}`,
  }],
  ['/contact', {
    title: 'Contact',
    description: 'Contact RAKSENT to discuss a security engagement.',
    main: intro('Contact', 'Let’s discuss your security needs', 'Send an inquiry with your objectives, timeline and the systems you’re authorized to discuss.') +
      `<section class="shell split section"><div><h2>Start an inquiry</h2><p>Use the assessment form for new engagements and related questions.</p></div><div><p>If an engagement is already underway, use the secure channel agreed with your project contact.</p><a class="button" href="/request-assessment">Open the inquiry form</a></div></section>`,
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

for (const service of services) {
  pages.set(`/services/${service.slug}`, {
    title: service.name,
    description: service.summary,
    main: intro('<a href="/services">Security services</a>', escapeHtml(service.name), escapeHtml(service.summary)) +
      `<section class="shell section service-detail">
      <div class="detail-card"><h2>Typical scope</h2>${list(service.scope)}</div>
      <div class="detail-card"><h2>What you receive</h2>${list(service.deliverables)}</div>
      </section>
      <section class="shell split section"><div><h2>When to consider it</h2></div><p>${escapeHtml(service.suitableFor)}</p></section>
      ${callout('Discuss this service', 'Tell us about the systems and outcomes you want to cover.', 'Request an assessment', `/request-assessment?service=${service.slug}`)}`,
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
      main: intro('Services', 'Find the right security engagement', 'Explore the scope and deliverables for each service.') +
        `<section class="shell section catalog">${nav}${serviceCards(selected ? services.filter(service => service.group === selected.slug) : services)}</section>`,
    });
  }
  const page = pages.get(path);
  return page ? layout({ ...page, path }) : null;
}

export function renderForm({ values = {}, errors = {}, error = '', receipt = '', enabled = true } = {}) {
  const invalid = Object.keys(errors).length > 0;
  const notice = error ? `<p class="notice notice-error" role="alert">${escapeHtml(error)}</p>` : '';
  const errorText = name => errors[name] ? `<span class="field-error" id="${name}-error">${escapeHtml(errors[name])}</span>` : '';
  const errorAttrs = name => errors[name] ? ` aria-invalid="true" aria-describedby="${name}-error"` : '';
  const input = (name, label, autocomplete, max, type = 'text') => `<label for="${name}">${label}
    <input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" required maxlength="${max}" value="${escapeHtml(values[name] || '')}"${errorAttrs(name)}>
    ${errorText(name)}</label>`;
  if (receipt) {
    return layout({
      path: '/request-assessment', title: 'Inquiry received',
      description: 'Confirmation for your RAKSENT security assessment inquiry.',
      index: false,
      main: intro('Assessment inquiry', 'Inquiry received', 'Your inquiry was saved. Keep this reference for your records.') +
        `<section class="shell section"><div class="form-panel"><p class="reference"><code>${escapeHtml(receipt)}</code></p><p><a href="/services">Explore security services</a></p></div></section>`,
    });
  }

  const form = enabled ? `<div class="form-panel">${notice}${invalid ? '<p class="notice notice-error" role="alert">Review the highlighted fields and try again.</p>' : ''}
    <form method="post" action="/request-assessment">
    ${input('name', 'Name', 'name', 120)}
    ${input('email', 'Work email', 'email', 254, 'email')}
    ${input('organization', 'Organization', 'organization', 160)}
    <label for="service">Service <select id="service" name="service" required${errorAttrs('service')}><option value="">Select a service</option>
    ${services.map(service => `<option value="${service.slug}"${values.service === service.slug ? ' selected' : ''}>${escapeHtml(service.name)}</option>`).join('')}
    <option value="other"${values.service === 'other' ? ' selected' : ''}>Help me choose</option></select>${errorText('service')}</label>
    <label class="wide" for="message">What would you like to assess? <textarea id="message" name="message" rows="5" required minlength="15" maxlength="3000"${errorAttrs('message')}>${escapeHtml(values.message || '')}</textarea>${errorText('message')}</label>
    <label hidden>Website <input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="wide form-note">Please omit credentials, customer data and technical evidence. Read our <a href="/privacy">privacy notice</a>.</p>
    <div class="wide"><button class="button" type="submit">Send inquiry</button></div>
    </form></div>`
    : notice || '<p class="notice" role="status">The inquiry form is currently unavailable.</p>';
  return layout({
    path: '/request-assessment', title: 'Request a security assessment',
    description: 'Request a scoped security assessment for your organization.',
    main: intro('Assessment inquiry', 'Request a security assessment', 'Tell us about the systems, risks or compliance goals you want to address.') +
      `<section class="shell section form-layout">${form}<aside class="form-aside"><h2>What happens next?</h2><ol><li>We review your objectives and timeline.</li><li>We discuss the systems in scope and required approvals.</li><li>We agree on deliverables before work begins.</li></ol></aside></section>`,
  });
}

export function renderNotFound() {
  return layout({
    path: '/404', title: 'Page not found', description: 'This page could not be found.', index: false,
    main: intro('404', 'Page not found', 'Return to the <a href="/">RAKSENT home page</a>.'),
  });
}
