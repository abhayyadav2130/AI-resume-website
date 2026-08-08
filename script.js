const input = document.querySelector('#fileInput');
const card = document.querySelector('#uploadCard');
const results = document.querySelector('#results');
const API_URL = window.ATS_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('atsToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

async function authenticate() {
  if (localStorage.getItem('atsToken')) return;
  const email = window.prompt('Enter your email to save this analysis:');
  if (!email) throw new Error('Sign-in is required to analyze a resume.');
  const password = window.prompt('Enter your password (or create one with at least 8 characters):');
  if (!password) throw new Error('Sign-in is required to analyze a resume.');
  try {
    const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('atsToken', login.token);
  } catch (loginError) {
    const name = window.prompt('No account was found. Enter your name to create one:');
    if (!name) throw loginError;
    const register = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    localStorage.setItem('atsToken', register.token);
  }
}

function showStatus(message) {
  card.querySelector('.upload-text strong').textContent = message;
  card.querySelector('.upload-text span').textContent = 'This can take a few seconds.';
}

function renderAnalysis(analysis) {
  document.querySelector('.score-number strong').textContent = analysis.atsScore;
  document.querySelector('.score-card p').innerHTML = `<strong>${analysis.matchPercentage}% match</strong> with the supplied role requirements.`;
  document.querySelector('.score-tag').textContent = analysis.overallRating;
  const heading = document.querySelector('.analysis-card h3');
  heading.textContent = analysis.summary;
  const metrics = [
    ['Keyword & skills match', analysis.matchPercentage],
    ['ATS compatibility', analysis.atsScore],
    ['Resume readiness', Math.round((analysis.atsScore + analysis.matchPercentage) / 2)]
  ];
  document.querySelector('.analysis-card').querySelectorAll('.meter-row').forEach((row, index) => {
    const [label, value] = metrics[index]; row.querySelector('span').textContent = label; row.querySelector('i').style.width = `${value}%`; row.querySelector('b').textContent = value;
  });
  const recommendations = [...analysis.improvements, ...analysis.grammarIssues, ...analysis.formatSuggestions, ...analysis.missingKeywords.slice(0, 3).map((keyword) => `Add evidence of “${keyword}” where it accurately reflects your experience.`)].filter(Boolean).slice(0, 3);
  const tips = document.querySelector('.tips-grid');
  tips.innerHTML = recommendations.map((tip, index) => `<article class="tip${index === 2 ? ' accent' : ''}"><span class="tip-number">0${index + 1}</span><h3>${['Priority improvement', 'Missing ATS signal', 'Next best change'][index]}</h3><p>${tip}</p><a href="#upload">Review again <span>→</span></a></article>`).join('') || '<article class="tip"><h3>No critical changes found</h3><p>This resume is already well aligned. Tailor it to each role before applying.</p></article>';
  results.classList.add('show');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function review(file) {
  if (!file || !/\.(pdf|docx)$/i.test(file.name)) return;
  const jobDescription = window.prompt('Paste the job description you want this resume compared against:');
  if (!jobDescription || jobDescription.trim().length < 40) {
    card.querySelector('.upload-text strong').textContent = 'Add a full job description first';
    card.querySelector('.upload-text span').textContent = 'Paste at least 40 characters when the job-description box appears, then upload your PDF again.';
    return;
  }
  const jobTitle = window.prompt('Job title (optional):') || '';
  const company = window.prompt('Company (optional):') || '';
  try {
    showStatus('Signing in and securely uploading your resume…');
    await authenticate();
    const form = new FormData(); form.append('resume', file);
    const upload = await request('/resume/upload', { method: 'POST', body: form });
    showStatus('Finding the highest-impact improvements…');
    const result = await request('/resume/analyze', { method: 'POST', body: JSON.stringify({ uploadId: upload.upload.id, jobDescription, jobTitle, company }) });
    renderAnalysis(result.analysis);
    showStatus(file.name);
    card.querySelector('.upload-text span').textContent = 'Analysis complete — upload another PDF to compare.';
  } catch (error) {
    showStatus('We could not analyze that resume');
    card.querySelector('.upload-text span').textContent = error instanceof TypeError ? 'The backend is offline. Start it with: npm.cmd run dev (inside the backend folder).' : error.message;
  }
}

document.querySelector('#browseButton').addEventListener('click', (event) => { event.stopPropagation(); input.click(); });
card.addEventListener('click', () => input.click());
input.addEventListener('change', () => review(input.files[0]));
['dragenter', 'dragover'].forEach((type) => card.addEventListener(type, (event) => { event.preventDefault(); card.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((type) => card.addEventListener(type, (event) => { event.preventDefault(); card.classList.remove('dragging'); }));
card.addEventListener('drop', (event) => review(event.dataTransfer.files[0]));
document.querySelector('#newReview').addEventListener('click', () => { results.classList.remove('show'); input.value = ''; card.querySelector('.upload-text strong').textContent = 'Drop your resume here'; card.querySelector('.upload-text span').innerHTML = 'or <button type="button" id="browseButton">browse files</button> from your computer'; window.scrollTo({ top: 0, behavior: 'smooth' }); });
