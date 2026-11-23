const login = document.querySelector('#login');
const dashboard = document.querySelector('#dashboard');
const tokenInput = document.querySelector('#token');
const feedback = document.querySelector('#feedback');
const engagements = document.querySelector('#engagements');
const report = document.querySelector('#report');
let token = '';
let session = 0;
let reportRequest = 0;

function add(parent, tag, content) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  parent.append(element);
  return element;
}

async function get(path) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new Error('The access token is invalid or expired.');
  if (!response.ok) throw new Error('The portal could not load this request.');
  return response;
}

login.addEventListener('submit', async event => {
  event.preventDefault();
  const version = ++session;
  token = tokenInput.value;
  tokenInput.value = '';
  feedback.textContent = 'Loading dashboard…';
  try {
    const data = await (await get('/api/dashboard')).json();
    if (version !== session) return;
    document.querySelector('#client').textContent = data.client;
    engagements.replaceChildren();
    for (const item of data.engagements) {
      const button = add(add(engagements, 'li'), 'button', item.name);
      button.type = 'button';
      button.addEventListener('click', () => showReport(item.id));
    }
    login.hidden = true;
    dashboard.hidden = false;
    feedback.textContent = data.engagements.length ? '' : 'There are no engagements yet.';
  } catch (error) {
    if (version !== session) return;
    token = '';
    feedback.textContent = error.message;
  }
});

document.querySelector('#logout').addEventListener('click', () => {
  session++;
  token = '';
  report.replaceChildren();
  report.hidden = true;
  engagements.replaceChildren();
  document.querySelector('#client').textContent = '';
  feedback.textContent = '';
  dashboard.hidden = true;
  login.hidden = false;
  tokenInput.focus();
});

async function showReport(id) {
  const version = session;
  const request = ++reportRequest;
  feedback.textContent = 'Loading engagement…';
  try {
    const data = await (await get(`/api/engagements/${encodeURIComponent(id)}`)).json();
    if (version !== session || request !== reportRequest) return;
    report.replaceChildren();
    add(report, 'h3', data.name);
    add(report, 'p', data.scope);
    const download = add(report, 'button', 'Download report (JSON)');
    download.type = 'button';
    download.addEventListener('click', () => downloadReport(id, version));
    add(report, 'h4', 'Findings');
    for (const finding of data.findings) {
      const item = add(report, 'section');
      add(item, 'h4', finding.title);
      add(item, 'p', `${finding.severity} · ${finding.status.replaceAll('_', ' ')}`);
      add(item, 'p', finding.detail);
      add(item, 'p', finding.remediation);
    }
    if (!data.findings.length) add(report, 'p', 'No findings recorded.');
    report.hidden = false;
    feedback.textContent = '';
  } catch (error) {
    if (version === session && request === reportRequest) feedback.textContent = error.message;
  }
}

async function downloadReport(id, version) {
  try {
    const blob = await (await get(`/api/engagements/${encodeURIComponent(id)}/report`)).blob();
    if (version !== session) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment-${id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (version === session) feedback.textContent = error.message;
  }
}
