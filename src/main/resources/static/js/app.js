/**
 * NGO Connect - Frontend Single Page Application Logic
 * Integrates with Spring Boot REST APIs using session-based auth & fetch()
 */

// ── State ──────────────────────────────────────────────────
const state = {
  user: null,
  currentView: 'home',
  disasters: [],
  donations: [],
  requirements: [],
  campaigns: [],
  matches: []
};

// ── Toast Utility ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '&check;' : type === 'error' ? '&times;' : 'i';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Escaping Helpers ───────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ── API Helper ─────────────────────────────────────────────
async function api(url, options = {}) {
  options.credentials = 'include';
  if (options.body && !(options.body instanceof FormData)) {
    options.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
  }
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      if (state.user) {
        state.user = null;
        updateNav();
        showToast('Session expired. Please log in again.', 'warning');
      }
      return null;
    }
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errMsg = (data && data.message) || (data && data.error) || 'An error occurred';
      throw new Error(errMsg);
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ── Navigation & View Switching ────────────────────────────
async function clickHome() {
  if (state.user) {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    state.user = null;
    updateNav();
    showToast('Logged out of profile. Showing Care Center community needs.', 'info');
  }
  navigateTo('home');
}

function navigateTo(viewId) {
  // Clicking home logs out of profile to only show common public details
  if (viewId === 'home' && state.user) {
    try {
      api('/api/auth/logout', { method: 'POST' });
    } catch {}
    state.user = null;
    updateNav();
    showToast('Logged out of profile. Showing Care Center community needs.', 'info');
  }

  // Browse Donations is exclusively for Care Centers and NGOs
  if (viewId === 'donations') {
    const isNgoOrCareCenter = state.user && (state.user.role === 'NGO' || state.user.role === 'CONSUMER');
    if (!isNgoOrCareCenter) {
      showToast('Browse Donations is accessible exclusively to registered Care Centers and NGOs.', 'info');
      navigateTo('home');
      return;
    }
  }

  state.currentView = viewId;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update active nav links
  document.querySelectorAll('.navbar-nav a, .mobile-menu a').forEach(a => {
    if (a.getAttribute('data-view') === viewId) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // Close mobile menu if open
  closeMobileMenu();

  // Load view-specific data
  if (viewId === 'home') loadHome();
  else if (viewId === 'donations') loadDonations();
  else if (viewId === 'requirements') loadRequirements();
  else if (viewId === 'disaster') loadDisasterRelief();
  else if (viewId === 'dashboard') loadDashboard();
}

function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.remove('open');
}

// ── Auth Handling ──────────────────────────────────────────
async function checkAuth() {
  try {
    const user = await api('/api/auth/me');
    state.user = user;
  } catch {
    state.user = null;
  }
  updateNav();
}

function updateNav() {
  const user = state.user;
  const guestNav = document.getElementById('nav-guest-actions');
  const userNav = document.getElementById('nav-user-actions');
  const userChip = document.getElementById('nav-user-chip');
  const dashboardNav = document.getElementById('nav-dashboard-link');

  if (user) {
    if (guestNav) guestNav.classList.add('hidden');
    if (userNav) userNav.classList.remove('hidden');
    if (userChip) {
      const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      userChip.innerHTML = `
        <span class="avatar">${initial}</span>
        <span>${user.name}</span>
        <span class="badge badge-primary text-xs">${user.role}</span>
        ${user.aadhaarVerified ? `<span class="badge badge-success text-xs" style="background:#059669; color:#fff;" title="Aadhaar Verified Contributor">Aadhaar Verified</span>` : ''}
      `;
    }
    if (dashboardNav) dashboardNav.classList.remove('hidden');
  } else {
    if (guestNav) guestNav.classList.remove('hidden');
    if (userNav) userNav.classList.add('hidden');
    if (dashboardNav) dashboardNav.classList.add('hidden');
  }

  // Browse Donations: Exclusively visible to NGOs and Care Centers (Consumer)
  const isNgoOrCareCenter = user && (user.role === 'NGO' || user.role === 'CONSUMER');
  const donationsNav = document.getElementById('nav-donations-link');
  const mobileDonationsNav = document.getElementById('mobile-nav-donations');
  if (donationsNav) {
    if (isNgoOrCareCenter) donationsNav.classList.remove('hidden');
    else donationsNav.classList.add('hidden');
  }
  if (mobileDonationsNav) {
    if (isNgoOrCareCenter) mobileDonationsNav.classList.remove('hidden');
    else mobileDonationsNav.classList.add('hidden');
  }

  // Update NGO Emergency Relief Launch Button
  const isNgo = user && user.role === 'NGO';
  const disasterBtn = document.getElementById('btn-launch-disaster');
  const disasterNotice = document.getElementById('ngo-only-disaster-notice');
  if (disasterBtn) {
    if (isNgo) {
      disasterBtn.classList.remove('hidden');
      if (disasterNotice) disasterNotice.classList.add('hidden');
    } else {
      disasterBtn.classList.add('hidden');
      if (disasterNotice) disasterNotice.classList.remove('hidden');
    }
  }
}

async function loginUser(email, password) {
  try {
    const user = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    state.user = user;
    updateNav();
    closeModal('modal-login');
    showToast(`Welcome back, ${user.name}!`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
}

async function quickLogin(email, password) {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (emailInput && passInput) {
    emailInput.value = email;
    passInput.value = password;
  }
  await loginUser(email, password);
}

async function signupUser(formData) {
  try {
    const user = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    showToast('Account created successfully! Logging you in...', 'success');
    await loginUser(formData.email, formData.password);
    closeModal('modal-signup');
  } catch (err) {
    showToast(err.message || 'Signup failed', 'error');
  }
}

// ── Aadhaar Card Verification for Contributor ────────────────
let currentAadhaarTxnId = null;

function formatAadhaarInput(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 12);
  let parts = [];
  for (let i = 0; i < val.length; i += 4) {
    parts.push(val.substring(i, i + 4));
  }
  input.value = parts.join(' ');

  const icon = document.getElementById('aadhaar-verify-icon');
  if (icon) {
    if (val.length === 12) {
      if (val.startsWith('0') || val.startsWith('1')) {
        icon.innerHTML = '&times;'; icon.style.color = '#ef4444';
        icon.title = 'Aadhaar cannot start with 0 or 1';
      } else {
        icon.innerHTML = '&check;'; icon.style.color = '#10b981';
        icon.title = '12 Digits Ready';
      }
    } else {
      icon.textContent = '';
      icon.title = 'Enter 12 digits';
    }
  }
}

async function requestAadhaarOtp() {
  const name = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const city = document.getElementById('signup-city')?.value.trim();
  const rawAadhaar = document.getElementById('signup-aadhaar')?.value.replace(/\s+/g, '');

  if (!name) {
    showToast('Please enter your full name as in Aadhaar card', 'error');
    document.getElementById('signup-name')?.focus();
    return;
  }
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address', 'error');
    document.getElementById('signup-email')?.focus();
    return;
  }
  if (!password || password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    document.getElementById('signup-password')?.focus();
    return;
  }
  if (!city) {
    showToast('Please enter your city', 'error');
    document.getElementById('signup-city')?.focus();
    return;
  }
  if (!rawAadhaar || rawAadhaar.length !== 12) {
    showToast('Please enter a valid 12-digit Aadhaar number', 'error');
    document.getElementById('signup-aadhaar')?.focus();
    return;
  }
  if (rawAadhaar.startsWith('0') || rawAadhaar.startsWith('1')) {
    showToast('Invalid Aadhaar: Cannot start with 0 or 1', 'error');
    return;
  }

  const btn = document.getElementById('btn-contributor-send-otp');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Analyzing Aadhaar...`;
  }

  try {
    const res = await api('/api/auth/aadhaar/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        aadhaarNumber: rawAadhaar,
        name: name,
        email: email
      })
    });

    currentAadhaarTxnId = res.txnId;

    // Show OTP Step
    const otpStep = document.getElementById('signup-aadhaar-otp-step');
    const maskedMobileEl = document.getElementById('otp-masked-mobile');
    const demoCodeEl = document.getElementById('otp-demo-code');
    const demoBanner = document.getElementById('otp-demo-banner');

    if (maskedMobileEl) maskedMobileEl.textContent = res.maskedMobile;
    if (demoCodeEl) demoCodeEl.textContent = res.demoOtp;
    if (demoBanner) demoBanner.classList.remove('hidden');

    if (otpStep) {
      otpStep.classList.remove('hidden');
      otpStep.scrollIntoView({ behavior: 'smooth' });
    }

    const otpInput = document.getElementById('signup-otp');
    if (otpInput) {
      otpInput.value = '';
      otpInput.focus();
    }

    if (btn) btn.classList.add('hidden');
    showToast(`Aadhaar Validated! OTP sent to ${res.maskedMobile}`, 'success');
  } catch (err) {
    showToast(err.message || 'Aadhaar analysis failed', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Analyze Aadhaar & Send OTP`;
    }
  }
}

function cancelAadhaarOtp() {
  const otpStep = document.getElementById('signup-aadhaar-otp-step');
  const btn = document.getElementById('btn-contributor-send-otp');
  if (otpStep) otpStep.classList.add('hidden');
  if (btn) btn.classList.remove('hidden');
  document.getElementById('signup-aadhaar')?.focus();
}

async function verifyAadhaarOtpAndSignup() {
  const otp = document.getElementById('signup-otp')?.value.trim();
  const name = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const city = document.getElementById('signup-city')?.value.trim();
  const rawAadhaar = document.getElementById('signup-aadhaar')?.value.replace(/\s+/g, '');

  if (!currentAadhaarTxnId) {
    showToast('Please generate an Aadhaar OTP first', 'error');
    return;
  }
  if (!otp || otp.length !== 6) {
    showToast('Please enter the 6-digit OTP sent to your registered mobile', 'error');
    document.getElementById('signup-otp')?.focus();
    return;
  }

  const btn = document.getElementById('btn-verify-otp-submit');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Validating OTP...`;
  }

  try {
    const user = await api('/api/auth/aadhaar/verify-signup', {
      method: 'POST',
      body: JSON.stringify({
        txnId: currentAadhaarTxnId,
        otp: otp,
        name: name,
        email: email,
        password: password,
        aadhaarNumber: rawAadhaar,
        city: city
      })
    });

    showToast('Aadhaar Verified & Contributor Account Created! Logging you in...', 'success');
    await loginUser(email, password);
    closeModal('modal-signup');
  } catch (err) {
    showToast(err.message || 'OTP validation failed', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Validate OTP & Sign Up`;
    }
  }
}

function handleSignupSubmit(form) {
  const role = document.getElementById('signup-role')?.value;
  if (role === 'CONTRIBUTOR') {
    requestAadhaarOtp();
  } else {
    signupUser({
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
      role: role,
      city: document.getElementById('signup-city').value,
      organizationName: document.getElementById('signup-org') ? document.getElementById('signup-org').value : null
    });
  }
}

async function logoutUser() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {}
  state.user = null;
  updateNav();
  showToast('Logged out successfully', 'info');
  navigateTo('home');
}

// ── Modals Management ──────────────────────────────────────
function openModal(modalId) {
  if (modalId === 'modal-create-disaster') {
    if (!state.user) {
      showToast('Please log in as a registered NGO to post emergency disaster relief needs.', 'warning');
      const loginModal = document.getElementById('modal-login');
      if (loginModal) loginModal.classList.add('open');
      return;
    }
    if (state.user.role !== 'NGO') {
      showToast('Access restricted: Only registered NGOs can post emergency disaster relief needs.', 'error');
      return;
    }
  }
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// ── Disaster Relief Banner & Hub ───────────────────────────
async function loadDisasterBanner() {
  try {
    const active = await api('/api/disaster/active');
    const banner = document.getElementById('emergency-banner');
    if (!active || active.length === 0) {
      if (banner) banner.classList.add('hidden');
      return;
    }
    state.disasters = active;
    if (banner) {
      banner.classList.remove('hidden');
      const d = active[0];
      const itemsHtml = d.needs ? d.needs.slice(0, 3).map(n => 
        `<span class="disaster-banner-item" onclick="openDisasterDetail(${d.id})">${n.itemName} (${n.quantityPledged}/${n.quantityNeeded})</span>`
      ).join('') : '';

      const timeInfo = d.daysRemaining !== undefined && d.daysRemaining !== null
        ? (d.daysRemaining > 0 ? `${d.daysRemaining}d remaining` : `${d.hoursRemaining || 1}h remaining`)
        : '7-day window';

      banner.innerHTML = `
        <div class="disaster-banner-inner">
          <div class="disaster-banner-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div class="disaster-banner-content">
            <div class="disaster-banner-title">EMERGENCY RELIEF ACTIVE (Active for 7 Days • ${timeInfo}): ${d.title} (${d.city})</div>
            <div class="disaster-banner-items">
              ${itemsHtml}
              <span class="disaster-banner-item" onclick="navigateTo('disaster')">View All Needs →</span>
            </div>
          </div>
          <div class="disaster-banner-actions flex items-center gap-2">
            <button class="btn btn-sm" style="background: #ffffff; color: #b91c1c; font-weight: 700; border: none; box-shadow: 0 2px 6px rgba(0,0,0,0.15); cursor: pointer;" onclick="goToEmergencyDonate(${d.campaignId || d.id}, ${d.id}, '${(d.title || '').replace(/'/g, "\\'")}')">Help Now (Donate Funds)</button>
            <button class="btn btn-sm btn-outline" style="color: white; border-color: rgba(255,255,255,0.7); cursor: pointer;" onclick="openPledgeModal(${d.id})">Pledge Supplies</button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading disaster banner:', err);
  }
}

function goToEmergencyDonate(campaignId, disasterId, title) {
  // 1. Direct user to emergency disaster relief page
  navigateTo('disaster');
  
  // 2. Open the Razorpay donation modal for this emergency fund
  setTimeout(() => {
    openDonateModal(campaignId, title ? `${title} - Emergency Relief Fund` : 'Emergency Relief Fund');
  }, 120);
}

function openDisasterDetail(id) {
  const d = (state.disasters || []).find(x => x.id === id);
  if (d && d.campaignId) {
    goToEmergencyDonate(d.campaignId, d.id, d.title);
  } else {
    navigateTo('disaster');
  }
}

async function loadDisasterRelief() {
  const container = document.getElementById('disaster-cards-container');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const list = await api('/api/disaster/active');
    state.disasters = list || [];
    if (state.disasters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <h3>No Active Emergencies</h3>
          <p>There are currently no active disaster relief campaigns.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.disasters.map(d => {
      const target = d.moneyTarget || d.targetAmount || 0;
      const raised = d.moneyRaised || d.raisedAmount || 0;
      const pct = d.moneyProgress || (target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0);
      const needsHtml = d.needs && d.needs.length > 0 ? `
        <div class="mt-2 mb-2">
          <div class="text-xs font-semibold text-muted mb-1 uppercase">Needed Items:</div>
          <div class="flex flex-wrap gap-1">
            ${d.needs.map(n => `
              <span class="chip ${n.quantityPledged >= n.quantityNeeded ? 'badge-success' : 'badge-warning'}">
                ${n.itemName}: ${n.quantityPledged}/${n.quantityNeeded} ${n.unit || ''}
              </span>
            `).join('')}
          </div>
        </div>
      ` : '';

      const timeBadge = d.daysRemaining !== undefined && d.daysRemaining !== null ? `
        <span class="badge" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 0.72rem; font-weight: 700;">
          ⏱️ Active for 7 Days (${d.daysRemaining > 0 ? d.daysRemaining + ' days left' : (d.hoursRemaining || 1) + ' hrs left'})
        </span>
      ` : `
        <span class="badge" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 0.72rem; font-weight: 700;">
          ⏱️ Active for 7 Days
        </span>
      `;

      return `
        <div class="card" style="border-left: 4px solid var(--danger);">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="flex items-center gap-1 mb-1">
                <span class="badge badge-danger">EMERGENCY RELIEF</span>
                ${timeBadge}
              </div>
              <h3 class="card-title mt-1">${d.title}</h3>
              <p class="card-subtitle">${d.city} • Organized by ${d.createdByNgoName || d.organizationName || 'Verified NGO'}</p>
            </div>
          </div>
          <p class="text-sm text-muted mb-3">${d.description}</p>
          
          ${needsHtml}

          <div class="progress-wrap mt-3">
            <div class="progress-info">
              <span class="progress-label">Relief Fund Target</span>
              <span class="progress-pct">${pct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, #ef4444, #f97316);"></div>
            </div>
            <div class="progress-amounts">
              <span class="raised">₹${raised.toLocaleString()} raised</span>
              <span>Target: ₹${target.toLocaleString()}</span>
            </div>
          </div>

          <div class="card-footer flex justify-between items-center gap-2">
            <button class="btn btn-sm btn-outline" onclick="openPledgeModal(${d.id})">Pledge Materials</button>
            <button class="btn btn-sm btn-danger" onclick="openDonateModal(${d.campaignId}, '${d.title.replace(/'/g, "\\'")}')">Donate Funds</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load disaster relief: ${err.message}</div>`;
  }
}

// ── Browse Donations ───────────────────────────────────────
async function loadDonations() {
  const alertContainer = document.getElementById('donation-visibility-alert');
  const user = state.user;
  if (alertContainer) {
    if (!user) {
      alertContainer.className = 'alert alert-info mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">i</span>
        <div><strong>Community Donation Logistics:</strong> Donations posted by contributors are routed directly to registered <strong>NGOs and Orphanages/Care Centers</strong>. <a href="javascript:void(0)" onclick="openModal('modal-login')" class="font-bold underline" style="color:var(--primary-dark);">Sign in as an NGO</a> to accept supplies for distribution, or as a Contributor to post donations.</div>
      `;
    } else if (user.role === 'CONTRIBUTOR') {
      alertContainer.className = 'alert alert-info mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">i</span>
        <div><strong>Contributor Direct Routing:</strong> Your donation posts are displayed directly to registered <strong>NGOs</strong> for collection and delivery. Below are community donation posts. You can also view your personal posts in <a href="javascript:void(0)" onclick="navigateTo('dashboard')" class="font-bold underline" style="color:var(--primary-dark);">My Dashboard</a>.</div>
      `;
    } else if (user.role === 'NGO') {
      alertContainer.className = 'alert alert-success mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">&check;</span>
        <div><strong>NGO Dispatch Hub:</strong> Showing community donations contributed by donors. Review details, accept items, and coordinate collection. Accepted items appear in your NGO Operations Center.</div>
      `;
    } else if (user.role === 'CONSUMER') {
      alertContainer.className = 'alert alert-success mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">&check;</span>
        <div><strong>Orphanage / Care Center View:</strong> Community donations available for distribution by partner NGOs to your center.</div>
      `;
    }
  }

  const container = document.getElementById('donations-grid');
  if (!container) return;

  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  const category = document.getElementById('filter-donation-cat')?.value || '';
  const city = document.getElementById('filter-donation-city')?.value || '';
  const status = document.getElementById('filter-donation-status')?.value || '';

  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (city) params.append('city', city);
  if (status) params.append('status', status);

  try {
    const list = await api(`/api/donations?${params.toString()}`);
    state.donations = list || [];
    renderDonationsGrid(container, state.donations);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load donations: ${err.message}</div>`;
  }
}

function renderDonationsGrid(container, list) {
  const now = Date.now();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  // Filter out any distributed post older than 2 days
  const activeList = (list || []).filter(item => {
    if (item.status === 'DISTRIBUTED' && item.distributedAt) {
      return (now - new Date(item.distributedAt).getTime()) < twoDaysMs;
    }
    return true;
  });

  if (!activeList || activeList.length === 0) {
    const isContributor = state.user && state.user.role === 'CONTRIBUTOR';
    container.innerHTML = `
      <div class="empty-state w-full">
        <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <h3>No Donations Available</h3>
        <p>${isContributor ? 'You can click "Create Donation Post" to contribute supplies!' : 'No community donation posts available matching these filters.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeList.map(item => {
    const isNgo = state.user && state.user.role === 'NGO';
    const isConsumer = state.user && state.user.role === 'CONSUMER';
    const canAccept = isNgo && item.status === 'POSTED';
    const photoHtml = item.photoPath 
      ? `<img src="${item.photoPath}" alt="${item.category}" class="card-image" onerror="this.outerHTML='<div class=\\\'card-img-placeholder\\\'\>No Photo</div>'"/>`
      : `<div class="card-img-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

    let distributedInfoHtml = '';
    if (item.status === 'DISTRIBUTED') {
      const remainingHours = item.distributedAt 
        ? Math.max(0, Math.ceil((new Date(item.distributedAt).getTime() + twoDaysMs - now) / (1000 * 60 * 60)))
        : 48;
      distributedInfoHtml = `
        <div class="alert alert-warning p-2 mt-2 text-xs flex items-center justify-between" style="border-radius: var(--radius-sm);">
          <span>Distributed to beneficiaries</span>
          <span class="font-semibold text-danger">Auto-deletes in ${remainingHours}h</span>
        </div>
      `;
    }

    return `
      <div class="card">
        ${photoHtml}
        <div class="flex justify-between items-start mb-1">
          <span class="badge badge-primary">${item.category}</span>
          <span class="badge badge-status-${item.status}">${item.status}</span>
        </div>
        <h3 class="card-title">${item.quantity} ${item.unit || 'units'} (${item.condition || 'GOOD'} condition)</h3>
        <p class="card-subtitle mb-2">${item.city} • by <strong>${item.contributorName}</strong></p>
        <p class="text-sm text-muted mb-2">${item.description || 'No description provided.'}</p>
        ${distributedInfoHtml}
        
        <div class="card-footer flex justify-between items-center mt-2">
          <span class="text-xs text-light">${new Date(item.createdAt).toLocaleDateString()}</span>
          ${canAccept ? `
            <button class="btn btn-sm btn-primary" onclick="acceptDonationPost(${item.id})">Accept for Distribution</button>
          ` : isConsumer ? `
            <span class="text-xs text-primary font-semibold">Available for Care Center</span>
          ` : item.status === 'DISTRIBUTED' ? `
            <span class="badge badge-warning text-xs">Clearing in 2 days</span>
          ` : `
            <span class="text-xs text-muted">Status: <strong>${item.status}</strong></span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function acceptDonationPost(id) {
  try {
    await api(`/api/donations/${id}/accept`, { method: 'PUT' });
    showToast('Donation accepted successfully! Checked into your NGO Logistics dashboard.', 'success');
    if (state.currentView === 'donations') loadDonations();
    if (state.user && state.user.role === 'NGO') loadNgoDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to accept donation', 'error');
  }
}

// ── Browse Requirements ───────────────────────────────────
async function loadRequirements() {
  const container = document.getElementById('requirements-grid');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  const item = document.getElementById('filter-req-item')?.value || '';
  const city = document.getElementById('filter-req-city')?.value || '';
  const urgency = document.getElementById('filter-req-urgency')?.value || '';

  const params = new URLSearchParams();
  if (item) params.append('item', item);
  if (city) params.append('city', city);
  if (urgency) params.append('urgency', urgency);

  try {
    const list = await api(`/api/requirements?${params.toString()}`);
    state.requirements = list || [];
    renderRequirementsGrid(container, state.requirements);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load requirements: ${err.message}</div>`;
  }
}

function renderRequirementsGrid(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="empty-state w-full" style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center; background: #ffffff; border-radius: 12px; border: 1px dashed #d1d5db;">
        <div class="empty-state-icon" style="margin-bottom: 0.75rem;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#154734" stroke-width="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></div>
        <h3 style="color: #111827; margin-bottom: 0.25rem;">No Care Center Requirements Yet</h3>
        <p class="text-muted text-sm mb-3">All default mock posts have been removed. Only real posts published by Care Centers appear here.</p>
        <button class="btn btn-sm btn-outline" onclick="quickLogin('consumer@orphanage.com', 'demo123')">Login as Demo Care Center to Post a Need →</button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(req => {
    const qtyText = `${req.quantityNeeded || req.quantity || ''} ${req.unit || ''}`.trim() || 'Supplies Needed';
    const careCenterName = req.postedByName || req.requesterName || 'Care Center';
    const isCareCenter = (req.postedByRole === 'CONSUMER' || !req.postedByRole);
    const roleLabel = isCareCenter ? 'Care Center / Orphanage' : (req.postedByRole || 'Care Center');
    const statusBadge = req.fulfilled
      ? `<span class="badge badge-success">FULFILLED</span>`
      : `<span class="badge badge-warning" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a;">ACTIVE NEED</span>`;
    const locationText = req.address ? `${req.city} (${req.address})` : req.city;
    const descSnippet = req.description ? `<p class="text-xs text-muted mb-2" style="line-height: 1.4;">${escapeHtml(req.description)}</p>` : '';

    return `
      <div class="card" style="border-top: 4px solid ${req.urgency === 'HIGH' ? 'var(--urgency-high)' : req.urgency === 'MEDIUM' ? 'var(--urgency-medium)' : 'var(--urgency-low)'}">
        <div class="flex justify-between items-start mb-2">
          <span class="badge badge-urgency-${req.urgency || 'MEDIUM'}">${req.urgency || 'MEDIUM'} URGENCY</span>
          ${statusBadge}
        </div>
        
        <div class="flex items-center gap-1 mb-2">
          <span style="font-size: 0.72rem; font-weight: 700; color: #154734; background: #e8f5e9; padding: 2px 8px; border-radius: 9999px;">
            🏢 ${escapeHtml(careCenterName)}
          </span>
          <span class="text-xs text-muted">(${roleLabel})</span>
        </div>

        <h3 class="card-title" style="margin-bottom: 0.25rem;">${escapeHtml(req.item)}</h3>
        <p class="text-sm font-semibold text-primary mb-1">Required: ${qtyText}</p>
        <p class="card-subtitle mb-2">📍 ${escapeHtml(locationText)} • For: <strong>${escapeHtml(req.forWhom || 'Care Home Residents')}</strong></p>
        ${descSnippet}
        
        <div class="card-footer flex justify-between items-center mt-3 pt-2" style="border-top: 1px solid #f3f4f6;">
          <span class="text-xs text-light">${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}</span>
          <button class="btn btn-sm btn-primary" onclick="openFulfillModal('${escapeJs(req.item)}', '${escapeJs(req.city || '')}')">I Can Provide This</button>
        </div>
      </div>
    `;
  }).join('');
}

function openFulfillModal(item, city) {
  if (!state.user) {
    showToast('Please log in as a Contributor to donate items.', 'warning');
    openModal('modal-login');
    return;
  }
  openModal('modal-create-donation');
  const catInput = document.getElementById('donation-category');
  const cityInput = document.getElementById('donation-city');
  const descInput = document.getElementById('donation-desc');
  if (cityInput) cityInput.value = city;
  if (descInput) descInput.value = `Fulfilling requirement for: ${item}`;
}

// ── Campaigns & Mock Payments ──────────────────────────────
async function loadCampaigns() {
  const container = document.getElementById('campaigns-grid');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  try {
    const list = await api('/api/campaigns');
    state.campaigns = list || [];
    renderCampaignsGrid(container, state.campaigns);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load campaigns: ${err.message}</div>`;
  }
}

function renderCampaignsGrid(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="empty-state w-full">
        <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
        <h3>No Active Campaigns</h3>
        <p>No fundraising campaigns currently active.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => {
    const pct = c.targetAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100)) : 0;
    return `
      <div class="card">
        <div class="flex justify-between items-start mb-2">
          <span class="badge ${c.type === 'DISASTER' ? 'badge-danger' : 'badge-primary'}">${c.type}</span>
          <span class="badge ${c.active ? 'badge-success' : 'badge-neutral'}">${c.active ? 'ACTIVE' : 'COMPLETED'}</span>
        </div>
        <h3 class="card-title">${c.title}</h3>
        <p class="card-subtitle mb-2">Created by ${c.creatorName} • ${c.organizationName || 'NGO Partner'}</p>
        <p class="text-sm text-muted mb-4">${c.description}</p>

        <div class="progress-wrap">
          <div class="progress-info">
            <span class="progress-label">Goal Progress</span>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
          <div class="progress-amounts">
            <span class="raised">₹${c.raisedAmount.toLocaleString()} raised</span>
            <span>Target: ₹${c.targetAmount.toLocaleString()}</span>
          </div>
        </div>

        <div class="card-footer flex justify-between items-center">
          <span class="text-xs text-light">${c.donationCount || 0} donors</span>
          <button class="btn btn-sm btn-accent" onclick="openDonateModal(${c.id}, '${c.title.replace(/'/g, "\\'")}')">Donate Money</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Razorpay Payment Gateway Integration ────────────────────
let currentCampaignId = null;

async function openDonateModal(campaignId, campaignTitle) {
  currentCampaignId = campaignId;
  const titleEl = document.getElementById('donate-modal-campaign-title');
  if (titleEl) titleEl.innerText = campaignTitle || 'Emergency Relief Fund';
  
  const custom = document.getElementById('custom-donation-amount');
  if (custom) custom.value = '';
  selectPresetAmount(1000);

  // Pre-fill user details if logged in
  if (state.user) {
    const nameEl = document.getElementById('donation-donor-name');
    const emailEl = document.getElementById('donation-donor-email');
    if (nameEl && !nameEl.value) nameEl.value = state.user.name || '';
    if (emailEl && !emailEl.value) emailEl.value = state.user.email || '';
  }

  // Check Razorpay configuration status
  try {
    const cfg = await api('/api/payment/config');
    const badge = document.getElementById('razorpay-status-badge');
    if (badge && cfg) {
      if (cfg.isConfigured) {
        badge.style.background = '#f0fdf4';
        badge.style.borderColor = '#bbf7d0';
        badge.style.color = '#166534';
        badge.innerHTML = `
          <div class="flex items-center gap-2">
            <span style="width: 8px; height: 8px; background: #16a34a; border-radius: 50%; box-shadow: 0 0 6px #16a34a;"></span>
            <span><strong>Razorpay Live Gateway Active:</strong> Payments credited directly to your account</span>
          </div>
          <span class="text-xs font-bold" style="color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">256-Bit SSL</span>
        </div>
        `;
      } else {
        badge.style.background = '#fffbeb';
        badge.style.borderColor = '#fde68a';
        badge.style.color = '#92400e';
        badge.innerHTML = `
          <div class="flex items-center gap-2">
            <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 6px #f59e0b;"></span>
            <span><strong>Razorpay Ready (Test Mode):</strong> Add API keys in application.properties for live credit</span>
          </div>
          <span class="text-xs font-bold" style="color: #d97706; background: #fef3c7; padding: 2px 6px; border-radius: 4px;">Sandbox Mode</span>
        `;
      }
    }
  } catch (e) {
    console.warn('Could not fetch payment config:', e);
  }

  openModal('modal-donate-money');
}

function selectPresetAmount(amount) {
  document.querySelectorAll('.amount-chip').forEach(btn => {
    if (parseInt(btn.dataset.amount) === amount) btn.classList.add('selected');
    else btn.classList.remove('selected');
  });
  document.getElementById('selected-donation-amount').value = amount;
  const custom = document.getElementById('custom-donation-amount');
  if (custom) custom.value = '';
}

function handleCustomAmountChange(e) {
  const val = parseFloat(e.target.value);
  if (val > 0) {
    document.querySelectorAll('.amount-chip').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('selected-donation-amount').value = val;
  }
}

async function initiateRazorpayPayment() {
  const amount = parseFloat(document.getElementById('selected-donation-amount').value);
  const note = document.getElementById('donation-donor-note')?.value || '';
  const donorName = document.getElementById('donation-donor-name')?.value || (state.user ? state.user.name : 'Kind Contributor');
  const donorEmail = document.getElementById('donation-donor-email')?.value || (state.user ? state.user.email : '');
  const donorPhone = document.getElementById('donation-donor-phone')?.value || '9876543210';

  if (!amount || amount <= 0) {
    showToast('Please enter a valid donation amount (minimum ₹1)', 'error');
    return;
  }

  if (!donorName || donorName.trim() === '') {
    showToast('Please enter your name for the donation receipt', 'warning');
    return;
  }

  const btn = document.getElementById('btn-confirm-payment');
  if (btn) btn.classList.add('btn-loading');

  try {
    // 1. Create order on server / Razorpay
    const order = await api('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: currentCampaignId,
        amount,
        donorName,
        donorEmail,
        donorPhone,
        note
      })
    });

    // 2. If valid Razorpay key is configured & Razorpay Checkout script is loaded:
    if (!order.isTestMode && typeof window.Razorpay === 'function') {
      const options = {
        key: order.keyId,
        amount: order.amountInPaise,
        currency: order.currency || 'INR',
        name: order.companyName || 'Smart Donation & NGO Connect',
        description: `Emergency Relief: ${order.campaignTitle}`,
        image: 'https://cdn-icons-png.flaticon.com/512/2910/2910768.png',
        order_id: order.orderId,
        handler: async function (response) {
          await verifyRazorpayPayment({
            razorpayOrderId: response.razorpay_order_id || order.orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            campaignId: currentCampaignId,
            amount: amount,
            donorName: donorName,
            note: note
          });
        },
        prefill: {
          name: donorName,
          email: donorEmail,
          contact: donorPhone
        },
        theme: {
          color: '#154734'
        },
        modal: {
          ondismiss: function () {
            showToast('Razorpay payment cancelled.', 'info');
            if (btn) btn.classList.remove('btn-loading');
          }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (res) {
        showToast('Payment Failed: ' + (res.error?.description || 'Transaction declined'), 'error');
        if (btn) btn.classList.remove('btn-loading');
      });
      rzp.open();
    } else {
      // Test Mode Simulation with instant verification
      const simPaymentId = 'pay_rzp_test_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await verifyRazorpayPayment({
        razorpayOrderId: order.orderId,
        razorpayPaymentId: simPaymentId,
        razorpaySignature: 'sig_verified_demo',
        campaignId: currentCampaignId,
        amount: amount,
        donorName: donorName,
        note: note
      });
    }
  } catch (err) {
    showToast(err.message || 'Payment initiation failed', 'error');
    if (btn) btn.classList.remove('btn-loading');
  }
}

async function verifyRazorpayPayment(verificationData) {
  const btn = document.getElementById('btn-confirm-payment');
  try {
    const res = await api('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });

    closeModal('modal-donate-money');
    
    const pointsNotice = res.pointsAwarded > 0 ? ` (+${res.pointsAwarded} Impact Points earned!)` : '';
    showToast(`Razorpay Payment of ₹${verificationData.amount.toLocaleString()} Successful! ID: ${res.paymentId}${pointsNotice}`, 'success');

    // Refresh campaigns and dashboards
    loadCampaigns();
    if (state.currentView === 'home') loadHome();
    if (state.currentView === 'disaster') loadDisasterRelief();
    if (state.user && state.user.role === 'CONTRIBUTOR') {
      loadContributorProfile();
    }
  } catch (err) {
    showToast(err.message || 'Payment verification failed', 'error');
  } finally {
    if (btn) btn.classList.remove('btn-loading');
  }
}

// ── Pledge Modal for Disaster Relief ───────────────────────
let currentDisasterId = null;
function openPledgeModal(disasterId) {
  if (!state.user) {
    showToast('Please log in to pledge supplies.', 'warning');
    openModal('modal-login');
    return;
  }
  currentDisasterId = disasterId;
  const d = state.disasters.find(x => x.id === disasterId);
  const select = document.getElementById('pledge-item-select');
  if (select && d && d.needs) {
    select.innerHTML = d.needs.map(n => `<option value="${n.itemName}">${n.itemName} (Needed: ${n.quantityNeeded - n.quantityPledged})</option>`).join('');
  }
  openModal('modal-pledge-material');
}

async function submitPledge() {
  const itemName = document.getElementById('pledge-item-select')?.value;
  const quantity = parseInt(document.getElementById('pledge-quantity')?.value);
  const note = document.getElementById('pledge-notes')?.value || '';

  if (!quantity || quantity <= 0) {
    showToast('Please enter a valid pledge quantity', 'error');
    return;
  }

  try {
    await api(`/api/disaster/${currentDisasterId}/pledge`, {
      method: 'POST',
      body: JSON.stringify({ itemName, quantity, note })
    });
    closeModal('modal-pledge-material');
    showToast(`Successfully pledged ${quantity} ${itemName}! Thank you!`, 'success');
    loadDisasterRelief();
    loadDisasterBanner();
  } catch (err) {
    showToast(err.message || 'Failed to submit pledge', 'error');
  }
}

// ── Home View ───────────────────────────────────────
async function loadHome() {
  await loadDisasterBanner();
  try {
    const recentReqs = await api('/api/requirements');
    const reqContainer = document.getElementById('home-urgent-reqs');
    if (reqContainer) {
      renderRequirementsGrid(reqContainer, recentReqs || []);
    }
  } catch (err) {
    console.error('Home load error:', err);
  }
}

// ── Dashboards ─────────────────────────────────────────────
async function loadDashboard() {
  if (!state.user) {
    navigateTo('home');
    openModal('modal-login');
    return;
  }

  // Hide all role dashboards
  document.querySelectorAll('.role-dashboard').forEach(d => d.classList.add('hidden'));

  const role = state.user.role;
  if (role === 'CONTRIBUTOR') {
    document.getElementById('dash-contributor')?.classList.remove('hidden');
    loadContributorDashboard();
  } else if (role === 'NGO') {
    document.getElementById('dash-ngo')?.classList.remove('hidden');
    loadNgoDashboard();
  } else if (role === 'CONSUMER') {
    document.getElementById('dash-consumer')?.classList.remove('hidden');
    loadConsumerDashboard();
  }
}

// 1. Contributor Dashboard & Profile Workspace
let contributorStatsCache = null;

async function loadContributorDashboard() {
  const container = document.getElementById('contributor-my-donations');
  const headerContainer = document.getElementById('contributor-profile-header');
  if (container) container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  if (headerContainer) headerContainer.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  try {
    const list = await api('/api/donations/my') || [];
    state.contributorDonations = list;

    // Calculate stats & impact points
    const stats = calculateContributorStats(list);
    contributorStatsCache = stats;

    // 1. Render Profile Header & Stat Pills (Matches Screenshot Layout)
    if (headerContainer && state.user) {
      const u = state.user;
      const firstName = (u.name || 'Friend').split(' ')[0];
      const now = new Date();
      const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

      headerContainer.innerHTML = `
        <div class="mb-4">
          <!-- Kicker & Badges -->
          <div class="flex justify-between items-center flex-wrap gap-2 mb-2">
            <div class="text-xs uppercase font-bold" style="letter-spacing: 1.2px; color: #154734;">
              YOUR IMPACT SPACE · ${monthYear}
            </div>
            <div class="flex items-center gap-1">
              <span class="badge badge-success text-xs">✓ Verified Contributor</span>
              ${u.aadhaarVerified ? `<span class="badge text-xs" style="background: #e8f5ee; color: #154734; border: 1px solid #c2e2cf;">✓ Aadhaar Verified</span>` : ''}
              <span class="points-tier-badge text-xs" style="margin: 0;">${stats.tierIcon} Level ${stats.level}: ${stats.tierName}</span>
            </div>
          </div>

          <!-- Greeting Header -->
          <h1 style="color: #0f172a; font-size: clamp(1.8rem, 4vw, 2.35rem); font-weight: 800; margin-bottom: 0.35rem; letter-spacing: -0.025em;">
            Good morning, ${firstName} ✦
          </h1>
          <p style="color: #64748b; font-size: 0.98rem; margin-bottom: 1.75rem;">
            A little kindness goes a long way. Here's where your generosity can make a difference.
          </p>

          <!-- 3 Crisp White Metric Cards Row (Matches Screenshot Design) -->
          <div class="grid-3 gap-3 mb-4">
            <!-- Card 1: Total donations made -->
            <div class="card p-3" style="position: relative; border-radius: 18px; border: 1px solid #e5ebe6; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div class="flex justify-between items-start mb-2">
                <span style="font-size: 0.85rem; font-weight: 600; color: #64748b;">Total donations made</span>
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #eaf5ef; color: #154734; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                  ♥
                </div>
              </div>
              <div style="font-size: 2.25rem; font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 0.5rem;">
                ${stats.total}
              </div>
              <div class="text-xs" style="color: #10b981; font-weight: 600;">
                ↑ Active contributor · Keep it going
              </div>
            </div>

            <!-- Card 2: Active in pipeline -->
            <div class="card p-3" style="position: relative; border-radius: 18px; border: 1px solid #e5ebe6; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div class="flex justify-between items-start mb-2">
                <span style="font-size: 0.85rem; font-weight: 600; color: #64748b;">Active in pipeline</span>
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #eaf5ef; color: #154734; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                  🚚
                </div>
              </div>
              <div style="font-size: 2.25rem; font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 0.5rem;">
                ${stats.active}
              </div>
              <div class="text-xs" style="color: #10b981; font-weight: 600;">
                ↑ Community logistics in progress
              </div>
            </div>

            <!-- Card 3: Delivered to care centers -->
            <div class="card p-3" style="position: relative; border-radius: 18px; border: 1px solid #e5ebe6; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div class="flex justify-between items-start mb-2">
                <span style="font-size: 0.85rem; font-weight: 600; color: #64748b;">Delivered to care centers</span>
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #eaf5ef; color: #154734; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                  🏥
                </div>
              </div>
              <div style="font-size: 2.25rem; font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 0.5rem;">
                ${stats.distributed}
              </div>
              <div class="text-xs" style="color: #64748b; font-weight: 500;">
                Across your local community
              </div>
            </div>
          </div>

          <!-- Hand2Heart Signature Kindness Spotlight Card (Matches Screenshot Hero) -->
          <div class="p-4 mb-4" style="background: #154734; border-radius: 20px; color: #ffffff; position: relative; overflow: hidden; box-shadow: 0 8px 24px -4px rgba(21, 71, 52, 0.35);">
            <div style="position: absolute; right: -30px; bottom: -30px; width: 220px; height: 220px; background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>
            <div style="position: relative; z-index: 2; max-width: 700px;">
              <div class="text-xs uppercase font-bold mb-2" style="letter-spacing: 1.5px; color: #86efac;">
                YOUR KINDNESS, IN ACTION
              </div>
              <h2 style="color: #ffffff; font-size: clamp(1.4rem, 3.2vw, 1.75rem); font-weight: 800; line-height: 1.25; margin-bottom: 0.65rem;">
                There's someone who needs exactly what you have.
              </h2>
              <p style="color: #d1fae5; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.25rem;">
                Our smart matching engine connects donations with verified care centers and orphanages based on real needs, urgency, and distance.
              </p>
              <div class="flex items-center gap-2 flex-wrap">
                <button class="btn btn-sm" style="background: #ffffff; color: #154734; font-weight: 700; border-radius: var(--radius-full); padding: 0.6rem 1.4rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" onclick="openModal('modal-create-donation')">
                  + Make a Donation
                </button>
                <button class="btn btn-sm" style="background: transparent; color: #ffffff; border: 1.5px solid rgba(255,255,255,0.4); border-radius: var(--radius-full); padding: 0.6rem 1.4rem;" onclick="switchContributorTab('matches')">
                  Explore Need Matches →
                </button>
              </div>
            </div>
          </div>

        </div>
      `;
    }

    // 2. Reflect Live Emergency Relief Broadcast
    await loadContributorEmergencyAlert();

    // 3. Render Tracking List
    const badge = document.getElementById('contrib-tracking-badge');
    if (badge) badge.textContent = list.length;
    renderContributorTracking(list);

    // 4. Load Smart Care Center Need Matches
    loadContributorNeedMatches();

    // 5. Load Nearby Care Centers
    loadNearbyCareCenters();

    // 6. Render Points View
    renderContributorPointsView(stats);

  } catch (err) {
    if (container) container.innerHTML = `<div class="alert alert-error">Failed to load contributor profile: ${err.message}</div>`;
  }
}

function calculateContributorStats(donations) {
  const total = (donations || []).length;
  let active = 0;
  let distributed = 0;
  let points = 0;

  (donations || []).forEach(d => {
    if (d.status === 'POSTED') {
      active++;
      points += 50;
    } else if (d.status === 'ACCEPTED') {
      active++;
      points += 150;
    } else if (d.status === 'COLLECTED') {
      active++;
      points += 250;
    } else if (d.status === 'DISTRIBUTED') {
      distributed++;
      points += 550;
    }
  });

  // Calculate Tier
  let level = 1;
  let tierName = 'Community Starter';
  let tierIcon = '🌟';
  let nextLevelPoints = 200;
  let prevLevelPoints = 0;

  if (points >= 3500) {
    level = 6;
    tierName = 'Champion of Hope';
    tierIcon = '👑';
    nextLevelPoints = 5000;
    prevLevelPoints = 3500;
  } else if (points >= 2000) {
    level = 5;
    tierName = 'Gold Philanthropist';
    tierIcon = '🥇';
    nextLevelPoints = 3500;
    prevLevelPoints = 2000;
  } else if (points >= 1000) {
    level = 4;
    tierName = 'Silver Benefactor';
    tierIcon = '🥈';
    nextLevelPoints = 2000;
    prevLevelPoints = 1000;
  } else if (points >= 500) {
    level = 3;
    tierName = 'Bronze Giver';
    tierIcon = '🥉';
    nextLevelPoints = 1000;
    prevLevelPoints = 500;
  } else if (points >= 200) {
    level = 2;
    tierName = 'Kind Neighbor';
    tierIcon = '🌿';
    nextLevelPoints = 500;
    prevLevelPoints = 200;
  }

  const progressPercent = Math.min(100, Math.round(((points - prevLevelPoints) / Math.max(1, (nextLevelPoints - prevLevelPoints))) * 100));

  return { total, active, distributed, points, level, tierName, tierIcon, nextLevelPoints, progressPercent };
}

function switchContributorTab(tabName) {
  const tabs = ['tracking', 'matches', 'carecenters', 'rewards'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-contrib-${t}`);
    const pane = document.getElementById(`contrib-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (pane) pane.classList.toggle('hidden', t !== tabName);
  });
}

function filterContributorTracking() {
  const keyword = (document.getElementById('contrib-search-tracking')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('contrib-filter-status')?.value || '';
  const all = state.contributorDonations || [];

  const filtered = all.filter(item => {
    const matchStatus = !statusFilter || item.status === statusFilter;
    const matchKeyword = !keyword || 
      (item.category && item.category.toLowerCase().includes(keyword)) ||
      (item.city && item.city.toLowerCase().includes(keyword)) ||
      (item.description && item.description.toLowerCase().includes(keyword)) ||
      (item.acceptedByNgoName && item.acceptedByNgoName.toLowerCase().includes(keyword));
    return matchStatus && matchKeyword;
  });

  renderContributorTracking(filtered);
}

function renderContributorTracking(list) {
  const container = document.getElementById('contributor-my-donations');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
        <h3>No Donations in Tracking</h3>
        <p>No donation posts match your search or filter. You can click "+ Make a Donation" to start your donation journey!</p>
        <button class="btn btn-sm btn-primary mt-2" onclick="openModal('modal-create-donation')">+ Make a Donation</button>
      </div>
    `;
    return;
  }

  const catIcons = {
    'Food': '🥫',
    'Clothes': '👕',
    'Medicine': '💊',
    'Books': '📚',
    'Electronics': '💻',
    'Other': '📦'
  };

  const stages = [
    { key: 'POSTED', label: 'Prepared & Posted' },
    { key: 'ACCEPTED', label: 'Accepted by NGO' },
    { key: 'COLLECTED', label: 'In Transit' },
    { key: 'DISTRIBUTED', label: 'Delivered' }
  ];

  container.innerHTML = list.map(item => {
    const icon = catIcons[item.category] || '📦';
    const currentIdx = stages.findIndex(s => s.key === item.status);
    const fillPercent = currentIdx === 0 ? 10 : currentIdx === 1 ? 40 : currentIdx === 2 ? 70 : 100;

    let autoDeleteHtml = '';
    if (item.status === 'DISTRIBUTED') {
      const remainingHours = item.distributedAt 
        ? Math.max(0, Math.ceil((new Date(item.distributedAt).getTime() + 2 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)))
        : 48;
      autoDeleteHtml = `
        <span class="badge badge-warning text-xs">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline; vertical-align:middle; margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Auto-clears in ${remainingHours}h
        </span>
      `;
    }

    return `
      <div class="tracking-card">
        <div class="tracking-card-header">
          <div class="flex items-start gap-2">
            <div class="tracking-item-icon">${icon}</div>
            <div>
              <div class="flex items-center gap-1 flex-wrap mb-1">
                <span class="badge badge-primary text-xs">${item.category}</span>
                <span class="text-xs text-muted font-semibold">#DON-${item.id}</span>
                <span class="text-xs text-light">• ${item.condition || 'GOOD'} Condition</span>
              </div>
              <h3 class="card-title" style="margin: 0; font-size: 1.15rem;">${item.quantity} ${item.unit || 'units'} (${item.category})</h3>
              <p class="text-xs text-muted" style="margin-top: 0.2rem;">
                Posted on ${new Date(item.createdAt).toLocaleDateString()} in ${item.city}
                ${item.acceptedByNgoName ? ` • Handover Partner: <strong>${item.acceptedByNgoName}</strong>` : ' • Awaiting NGO pickup partner'}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <span class="badge badge-status-${item.status}">${item.status === 'DISTRIBUTED' ? '✓ Delivered' : item.status === 'COLLECTED' ? '🚚 In Transit' : item.status}</span>
            ${autoDeleteHtml}
          </div>
        </div>

        ${item.description ? `<p class="text-sm text-muted mb-2">"${item.description}"</p>` : ''}

        <!-- Horizontal Pipeline Tracker -->
        <div class="tracking-track-line">
          <div class="tracking-track-bar">
            <div class="tracking-track-fill" style="width: ${fillPercent}%;"></div>
          </div>
          ${stages.map((st, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return `
              <div class="track-node ${isDone ? 'completed' : isCurrent ? 'current' : ''}">
                <div class="track-node-circle">
                  ${isDone ? '✓' : i + 1}
                </div>
                <div class="track-node-title">${st.label}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="tracking-card-footer mt-2">
          <span>
            ${item.status === 'POSTED' ? '📍 Waiting for a verified local NGO to accept and assign logistics' :
              item.status === 'ACCEPTED' ? `🤝 Accepted by ${item.acceptedByNgoName || 'NGO Partner'} on ${item.acceptedAt ? new Date(item.acceptedAt).toLocaleDateString() : 'recent'}` :
              item.status === 'COLLECTED' ? `🚚 Picked up from your address • En route to beneficiary care center` :
              `🎉 Handed over to care center beneficiaries on ${item.distributedAt ? new Date(item.distributedAt).toLocaleDateString() : 'recent'}`}
          </span>
          <span class="text-xs font-semibold text-primary">Live Tracking Active</span>
        </div>
      </div>
    `;
  }).join('');
}

async function loadContributorEmergencyAlert() {
  const container = document.getElementById('contributor-emergency-alert');
  if (!container) return;
  try {
    const active = await api('/api/disaster/active');
    if (!active || active.length === 0) {
      container.classList.add('hidden');
      return;
    }
    const d = active[0];
    container.classList.remove('hidden');
    const timeRemainingText = d.daysRemaining !== undefined && d.daysRemaining !== null
      ? `• Active for 7 Days (${d.daysRemaining > 0 ? d.daysRemaining + 'd left' : (d.hoursRemaining || 1) + 'h left'})`
      : '• Active for 7 Days';

    container.innerHTML = `
      <div class="contrib-emergency-banner">
        <div style="flex: 1; min-width: 280px;">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="contrib-emergency-tag">
              <span style="width: 7px; height: 7px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444;"></span>
              Live Emergency Relief Alert
            </span>
            <span class="text-xs font-semibold" style="color: #dc2626; font-weight: 700;">${timeRemainingText}</span>
            <span class="text-xs font-semibold text-muted">• ${d.city}</span>
          </div>
          <h3 style="color: #0f172a; font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem;">${d.title}</h3>
          <p style="color: #475569; font-size: 0.88rem; margin-bottom: 0.65rem;">${d.description || 'Humanitarian emergency response in progress. Critical supplies needed.'}</p>
          <div class="flex flex-wrap gap-1">
            ${(d.needs || []).slice(0, 3).map(n => `
              <span class="chip" style="background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; font-size: 0.75rem; font-weight: 600;">
                ${n.itemName}: ${n.quantityPledged}/${n.quantityNeeded} ${n.unit || ''}
              </span>
            `).join('')}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button class="btn btn-sm btn-danger" onclick="goToEmergencyDonate(${d.campaignId || d.id}, ${d.id}, '${(d.title || '').replace(/'/g, "\\'")}')">Donate Funds</button>
          <button class="btn btn-sm btn-outline" onclick="openPledgeModal(${d.id})">Pledge Supplies</button>
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('disaster')">Emergency Hub →</button>
        </div>
      </div>
    `;
  } catch (err) {
    container.classList.add('hidden');
  }
}

async function loadContributorNeedMatches() {
  const container = document.getElementById('contributor-need-matches');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const reqs = await api('/api/requirements');
    const badge = document.getElementById('contrib-matches-badge');
    const unfulfilled = (reqs || []).filter(r => !r.fulfilled);
    if (badge) badge.textContent = unfulfilled.length;

    if (unfulfilled.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <h3>No Open Requirements Found</h3>
          <p>Care centers in your network are currently supplied. You can post a general donation anytime!</p>
        </div>
      `;
      return;
    }

    // Sort by: same city first, then HIGH urgency
    const userCity = (state.user && state.user.city) ? state.user.city.toLowerCase().trim() : '';
    unfulfilled.sort((a, b) => {
      const aCityMatch = a.city && a.city.toLowerCase().trim() === userCity;
      const bCityMatch = b.city && b.city.toLowerCase().trim() === userCity;
      if (aCityMatch && !bCityMatch) return -1;
      if (!aCityMatch && bCityMatch) return 1;
      if (a.urgency === 'HIGH' && b.urgency !== 'HIGH') return -1;
      if (a.urgency !== 'HIGH' && b.urgency === 'HIGH') return 1;
      return 0;
    });

    container.innerHTML = `
      <div class="grid-2">
        ${unfulfilled.map(req => {
          const isSameCity = req.city && req.city.toLowerCase().trim() === userCity;
          const matchScore = isSameCity ? (req.urgency === 'HIGH' ? 98 : 92) : (req.urgency === 'HIGH' ? 88 : 78);
          return `
            <div class="recommend-card">
              <div>
                <div class="flex justify-between items-start mb-2 flex-wrap gap-1">
                  <span class="recommend-badge">
                    <span>✨</span> ${matchScore}% Match ${isSameCity ? '• In Your City' : ''}
                  </span>
                  <span class="badge ${req.urgency === 'HIGH' ? 'badge-danger' : 'badge-warning'} text-xs">${req.urgency || 'NORMAL'} NEED</span>
                </div>
                <h3 class="card-title mt-1" style="font-size: 1.1rem;">${req.item} (${req.quantityNeeded} ${req.unit || 'units'})</h3>
                <p class="text-xs text-muted mb-2">
                  Care Center: <strong>${req.postedByName}</strong> (${req.city || 'Nearby'})
                  ${req.forWhom ? ` • For: ${req.forWhom}` : ''}
                </p>
                <p class="text-sm text-muted mb-3">${req.description || 'Care center requirement awaiting generous community donations.'}</p>
              </div>
              <div class="card-footer flex justify-between items-center mt-2 pt-2 border-top">
                <span class="text-xs text-light">${new Date(req.createdAt).toLocaleDateString()}</span>
                <button class="btn btn-sm btn-success" onclick="openDonateForNeed('${req.item}', '${req.city || ''}', 'Fulfilling need for ${req.postedByName}: ${req.quantityNeeded} ${req.unit || 'units'} of ${req.item}')">+ Fulfill Need</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load care center needs: ${err.message}</div>`;
  }
}

async function loadNearbyCareCenters(searchCity) {
  const container = document.getElementById('contributor-nearby-carecenters');
  if (!container) return;
  const userCity = searchCity !== undefined ? searchCity : (state.user && state.user.city ? state.user.city : '');
  try {
    const list = await api('/api/carecenters' + (userCity ? `?city=${encodeURIComponent(userCity)}` : ''));
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state w-full">
          <h3>No Care Centers Found</h3>
          <p>No registered care centers found matching "${userCity}".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(c => {
      const isLocal = userCity && c.city && c.city.toLowerCase() === userCity.toLowerCase();
      return `
        <div class="card">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="flex items-center gap-1 mb-1">
                <span class="badge badge-primary text-xs">Care Center</span>
                ${isLocal ? `<span class="badge badge-success text-xs">In Your City</span>` : ''}
                ${c.verified ? `<span class="badge badge-neutral text-xs">Verified</span>` : ''}
              </div>
              <h3 class="card-title">${c.organizationName || c.name}</h3>
              <p class="card-subtitle">${c.city} • Contact: ${c.phone || c.email}</p>
            </div>
          </div>
          <p class="text-sm text-muted mb-3">
            ${c.openRequirementsCount > 0 
              ? `<strong class="text-primary">${c.openRequirementsCount} active need(s):</strong> ${c.neededItems.join(', ')}` 
              : 'Registered verified Care Center & Orphanage accepting direct contributions.'}
          </p>
          <div class="card-footer flex justify-between items-center">
            <span class="text-xs text-muted">${c.openRequirementsCount} open needs</span>
            <button class="btn btn-sm btn-primary" onclick="openDonateForNeed('', '${c.city}', 'Direct donation for ${c.organizationName || c.name}')">+ Direct Donate</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load care centers: ${err.message}</div>`;
  }
}

function renderContributorPointsView(stats) {
  const container = document.getElementById('contributor-points-view');
  if (!container) return;
  const s = stats || contributorStatsCache || { points: 0, level: 1, tierName: 'Community Starter', tierIcon: '🌟', nextLevelPoints: 200, progressPercent: 0 };

  container.innerHTML = `
    <div class="points-hero-card">
      <div>
        <span class="points-tier-badge">${s.tierIcon} Level ${s.level}: ${s.tierName}</span>
        <h2 style="color: #0f172a; font-size: 1.85rem; font-weight: 800; margin-bottom: 0.35rem;">${s.points} Impact Karma Points</h2>
        <p style="color: #475569; font-size: 0.92rem; margin-bottom: 1rem;">
          You are a recognized contributor making real impact in your community. 
          ${s.nextLevelPoints - s.points > 0 ? `<strong>${s.nextLevelPoints - s.points} points</strong> needed to reach next tier.` : 'You have achieved the highest contributor status!'}
        </p>
        <div style="background: #e2e8f0; border-radius: var(--radius-full); height: 10px; width: 100%; max-width: 440px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${s.progressPercent}%; border-radius: var(--radius-full);"></div>
        </div>
      </div>
      <div class="points-circle-counter">
        <span style="font-size: 1.75rem; font-weight: 800; color: #154734;">${s.points}</span>
        <span style="font-size: 0.7rem; font-weight: 700; color: #059669; text-transform: uppercase;">Points</span>
      </div>
    </div>

    <div class="card p-3 mb-3">
      <h3 class="mb-2" style="font-size: 1.1rem;">How You Earn Points for Donations</h3>
      <div class="grid-4 text-center">
        <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
          <div style="font-size: 1.4rem;">📝</div>
          <strong class="text-primary">+50 Pts</strong>
          <div class="text-xs text-muted mt-1">Post a Donation</div>
        </div>
        <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
          <div style="font-size: 1.4rem;">🤝</div>
          <strong class="text-primary">+100 Pts</strong>
          <div class="text-xs text-muted mt-1">NGO Accepts Post</div>
        </div>
        <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
          <div style="font-size: 1.4rem;">🚚</div>
          <strong class="text-primary">+150 Pts</strong>
          <div class="text-xs text-muted mt-1">Picked Up & In Transit</div>
        </div>
        <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
          <div style="font-size: 1.4rem;">🎉</div>
          <strong class="text-primary">+250 Pts</strong>
          <div class="text-xs text-muted mt-1">Delivered to Care Center</div>
        </div>
      </div>
    </div>
  `;
}

function openDonateForNeed(category, city, description) {
  openModal('modal-create-donation');
  if (category) {
    const catSelect = document.getElementById('donation-category');
    if (catSelect) {
      for (let i = 0; i < catSelect.options.length; i++) {
        if (catSelect.options[i].value.toLowerCase() === category.toLowerCase()) {
          catSelect.selectedIndex = i;
          break;
        }
      }
    }
  }
  const form = document.getElementById('form-create-donation');
  if (form) {
    if (city && form.elements['city']) form.elements['city'].value = city;
    if (description && form.elements['description']) form.elements['description'].value = description;
  }
}

// 2. NGO Dashboard
function switchNgoTab(tabName) {
  const tabs = ['available', 'accepted', 'matches'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-ngo-${t}`);
    const pane = document.getElementById(`ngo-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (pane) pane.classList.toggle('hidden', t !== tabName);
  });
}

async function loadNgoDashboard() {
  await Promise.all([
    loadNgoAvailableDonations(),
    loadNgoAcceptedDonations(),
    loadNgoMatches()
  ]);
}

async function loadNgoAvailableDonations() {
  const container = document.getElementById('ngo-available-donations');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const all = await api('/api/donations');
    const available = (all || []).filter(d => d.status === 'POSTED');
    const countBadge = document.getElementById('ngo-available-count');
    if (countBadge) countBadge.textContent = available.length;

    if (available.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
          <h3>No Incoming Contributor Donations Right Now</h3>
          <p>When contributors post supplies (food, clothes, medicine, etc.), they will appear here instantly for you to accept and collect!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid-2 gap-3">
        ${available.map(item => {
          const photoHtml = item.photoPath 
            ? `<img src="${item.photoPath}" alt="${item.category}" class="card-image" onerror="this.outerHTML='<div class=\\\'card-img-placeholder\\\'\>No Photo</div>'"/>`
            : `<div class="card-img-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
          return `
            <div class="card mb-3" style="border-top: 4px solid var(--primary);">
              ${photoHtml}
              <div class="flex justify-between items-start mb-2">
                <div>
                  <span class="badge badge-primary">${item.category}</span>
                  <h3 class="card-title mt-1">${item.quantity} ${item.unit || 'units'} (${item.condition || 'GOOD'} Condition)</h3>
                  <p class="card-subtitle"><strong>${item.city}</strong> • ${item.address || 'Address provided upon acceptance'}</p>
                </div>
                <span class="badge badge-status-POSTED">AVAILABLE</span>
              </div>
              <div class="p-2 mb-2" style="background: var(--surface-2); border-radius: var(--radius-sm); font-size: 0.85rem;">
                <div><strong>Contributor:</strong> ${item.contributorName}</div>
                ${item.description ? `<div class="text-muted mt-1">"${item.description}"</div>` : ''}
                <div class="text-xs text-light mt-1">Posted on: ${new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="card-footer flex justify-between items-center">
                <span class="text-xs text-muted">Awaiting NGO Pickup</span>
                <button class="btn btn-sm btn-primary" onclick="acceptDonationPost(${item.id})">Accept for Distribution</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadNgoAcceptedDonations() {
  const container = document.getElementById('ngo-accepted-donations');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const myAccepted = await api('/api/donations/accepted') || [];
    const countBadge = document.getElementById('ngo-accepted-count');
    if (countBadge) countBadge.textContent = myAccepted.length;

    if (myAccepted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
          <h3>No Accepted Donations Yet</h3>
          <p>Switch to the "Available Contributor Posts" tab to accept supplies for distribution to beneficiaries!</p>
          <button class="btn btn-sm btn-primary mt-2" onclick="switchNgoTab('available')">View Available Contributor Posts</button>
        </div>
      `;
      return;
    }

    container.innerHTML = myAccepted.map(item => `
      <div class="card mb-3">
        <div class="flex justify-between items-start mb-2">
          <div>
            <span class="badge badge-primary">${item.category}</span>
            <h3 class="card-title mt-1">${item.quantity} ${item.unit || 'units'}</h3>
            <p class="card-subtitle">${item.city} • Contributor: ${item.contributorName} (${item.address || 'Pickup location'})</p>
          </div>
          <span class="badge badge-status-${item.status}">${item.status}</span>
        </div>
        ${item.description ? `<p class="text-sm text-muted mb-2">"${item.description}"</p>` : ''}
        <div class="card-footer flex justify-between items-center flex-wrap gap-2">
          <span class="text-xs text-muted">Current Stage: <strong>${item.status}</strong></span>
          <div class="flex gap-1">
            ${item.status === 'ACCEPTED' ? `
              <button class="btn btn-sm btn-info" onclick="updateDonationStatus(${item.id}, 'COLLECTED')">Mark Collected</button>
            ` : ''}
            ${item.status === 'COLLECTED' ? `
              <button class="btn btn-sm btn-success" onclick="openProofModal(${item.id})">Mark Distributed & Upload Proof</button>
            ` : ''}
            ${item.status === 'DISTRIBUTED' ? `
              <div class="flex items-center gap-1 flex-wrap">
                <span class="badge badge-status-DISTRIBUTED">Distributed to Beneficiaries</span>
                <span class="badge badge-warning text-xs">Auto-deletes in ${item.distributedAt ? Math.max(0, Math.ceil((new Date(item.distributedAt).getTime() + 2 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60))) : 48}h</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadNgoMatches() {
  const container = document.getElementById('ngo-matches-list');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const matches = await api('/api/matches');
    state.matches = matches || [];
    if (state.matches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg></div>
          <h3>No Match Suggestions Yet</h3>
          <p>When available donation posts match community requirements in the same city and category, our algorithm will suggest them here!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.matches.map(m => {
      const don = m.donation || m.donationPost || {};
      const req = m.requirement || m.requirementPost || {};
      const city = m.city || don.city || req.city || 'Local';
      return `
      <div class="card mb-3" style="border-left: 4px solid var(--info);">
        <div class="flex justify-between items-center mb-2">
          <span class="badge badge-info">Score: ${m.matchScore}% Match</span>
          <span class="badge badge-neutral">${city}</span>
        </div>
        <div class="grid-2 gap-2 mb-3">
          <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
            <div class="text-xs font-semibold text-primary uppercase">Donation Available</div>
            <div class="font-bold">${don.quantity || ''} ${don.unit || ''} ${don.category || ''}</div>
            <div class="text-xs text-muted">By: ${don.contributorName || 'Donor'} (${don.condition || 'Good'})</div>
          </div>
          <div class="p-2" style="background: var(--surface-2); border-radius: var(--radius-sm);">
            <div class="text-xs font-semibold text-accent uppercase">Requirement Needed</div>
            <div class="font-bold">${req.quantityNeeded || req.quantity || ''} ${req.unit || ''} of ${req.item || ''}</div>
            <div class="text-xs text-muted">For: ${req.forWhom || 'Care center'}</div>
          </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <span class="text-xs text-muted">${m.matchReason || ''}</span>
          <button class="btn btn-sm btn-primary" onclick="acceptDonationPost(${don.id})">Accept & Connect This Match</button>
        </div>
      </div>
    `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function updateDonationStatus(id, newStatus) {
  try {
    if (newStatus === 'COLLECTED') {
      await api(`/api/donations/${id}/collect`, { method: 'PUT' });
    } else if (newStatus === 'ACCEPTED') {
      await api(`/api/donations/${id}/accept`, { method: 'PUT' });
    } else {
      await api(`/api/donations/${id}/status?status=${newStatus}`, { method: 'PUT' });
    }
    showToast(`Status updated to ${newStatus}`, 'success');
    loadNgoDashboard();
    if (state.currentView === 'donations') loadDonations();
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}

let currentDistributeId = null;
function openProofModal(donationId) {
  currentDistributeId = donationId;
  openModal('modal-proof-distribution');
}

async function submitProofDistribution() {
  const note = document.getElementById('distribute-notes')?.value || '';
  const photoInput = document.getElementById('distribute-photo');
  const formData = new FormData();
  formData.append('note', note);
  if (photoInput && photoInput.files[0]) {
    formData.append('photo', photoInput.files[0]);
    formData.append('proofPhoto', photoInput.files[0]);
  }

  try {
    await api(`/api/donations/${currentDistributeId}/distribute`, {
      method: 'POST',
      body: formData
    });
    closeModal('modal-proof-distribution');
    showToast('Proof uploaded! Donation marked as DISTRIBUTED (Auto-deletes from website in 2 days).', 'success');
    loadNgoDashboard();
    if (state.currentView === 'donations') loadDonations();
  } catch (err) {
    showToast(err.message || 'Failed to submit proof', 'error');
  }
}

// 3. Care Center Dashboard
function openCareCenterRequirementModal() {
  openModal('modal-create-requirement');
  if (state.user) {
    const cityInput = document.getElementById('req-city-input');
    const addressInput = document.getElementById('req-address-input');
    if (cityInput && !cityInput.value) cityInput.value = state.user.city || '';
    if (addressInput && !addressInput.value) addressInput.value = state.user.address || '';
  }
}

async function loadConsumerDashboard() {
  const container = document.getElementById('consumer-my-requirements');
  const headerContainer = document.getElementById('carecenter-profile-header');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  
  try {
    const list = await api('/api/requirements/my') || [];
    
    // Render Care Center Profile Header
    if (headerContainer && state.user) {
      const activeNeeds = list.filter(r => !r.fulfilled).length;
      const fulfilledNeeds = list.filter(r => r.fulfilled).length;
      headerContainer.innerHTML = `
        <div class="contrib-profile-banner mb-3">
          <div class="flex items-center gap-3">
            <div class="contrib-avatar" style="background: linear-gradient(135deg, #059669, #10b981);">
              🏥
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 style="color: #ffffff; margin: 0; font-size: 1.35rem;">${state.user.organizationName || state.user.name}</h2>
                <span class="badge badge-success text-xs">✓ Verified Care Center</span>
              </div>
              <p style="color: #a3e6cd; font-size: 0.85rem; margin: 0.2rem 0 0 0;">
                ${state.user.city || 'India'} • ${state.user.email} • Official Care Center & Orphanage Portal
              </p>
            </div>
          </div>
          <div class="contrib-profile-stats">
            <div class="contrib-stat-pill">
              <span class="stat-num">${list.length}</span>
              <span class="stat-lbl">Total Posts</span>
            </div>
            <div class="contrib-stat-pill">
              <span class="stat-num" style="color: #fca5a5;">${activeNeeds}</span>
              <span class="stat-lbl">Open Needs</span>
            </div>
            <div class="contrib-stat-pill">
              <span class="stat-num" style="color: #34d399;">${fulfilledNeeds}</span>
              <span class="stat-lbl">Fulfilled</span>
            </div>
          </div>
        </div>
      `;
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></div>
          <h3>No Requirements Posted Yet</h3>
          <p>Your care center has not posted any supply requirements. Click below to publish your first need so community contributors and NGOs can deliver it to you!</p>
          <button class="btn btn-primary mt-2" onclick="openCareCenterRequirementModal()">+ Post Your First Requirement</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid-2">
        ${list.map(req => {
          const isHigh = req.urgency === 'HIGH';
          return `
            <div class="card" style="border-left: 4px solid ${req.fulfilled ? 'var(--neutral)' : isHigh ? 'var(--danger)' : 'var(--accent)'};">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="flex items-center gap-1 mb-1">
                    <span class="badge ${req.fulfilled ? 'badge-neutral' : isHigh ? 'badge-danger' : 'badge-warning'} text-xs">
                      ${req.fulfilled ? '✓ FULFILLED' : (req.urgency || 'MEDIUM') + ' URGENCY'}
                    </span>
                    <span class="text-xs text-muted font-semibold">#REQ-${req.id}</span>
                  </div>
                  <h3 class="card-title mt-1" style="font-size: 1.15rem;">${req.item} (${req.quantityNeeded} ${req.unit || 'units'})</h3>
                  <p class="card-subtitle text-xs" style="margin-top: 0.2rem;">
                    For: <strong>${req.forWhom || 'Care center residents'}</strong> • ${req.city}
                  </p>
                </div>
              </div>

              ${req.description ? `<p class="text-sm text-muted mb-2">"${req.description}"</p>` : ''}
              ${req.address ? `<p class="text-xs text-muted mb-3">📍 Delivery Location: ${req.address}</p>` : ''}

              <div class="card-footer flex justify-between items-center pt-2 border-top flex-wrap gap-1">
                <span class="text-xs text-light">Posted: ${new Date(req.createdAt).toLocaleDateString()}</span>
                <div class="flex gap-1">
                  <button class="btn btn-sm ${req.fulfilled ? 'btn-outline' : 'btn-success'}" onclick="toggleRequirementFulfilled(${req.id})">
                    ${req.fulfilled ? 'Re-open Need' : '✓ Mark Fulfilled'}
                  </button>
                  <button class="btn btn-sm btn-ghost text-danger" onclick="deleteRequirement(${req.id})" title="Delete post">
                    ✕ Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function toggleRequirementFulfilled(id) {
  try {
    await api(`/api/requirements/${id}/fulfill`, { method: 'PUT' });
    showToast('Requirement status updated!', 'success');
    loadConsumerDashboard();
    loadRequirements();
  } catch (err) {
    showToast(err.message || 'Failed to update requirement', 'error');
  }
}

async function deleteRequirement(id) {
  if (!confirm('Are you sure you want to remove this requirement post?')) return;
  try {
    await api(`/api/requirements/${id}`, { method: 'DELETE' });
    showToast('Requirement removed successfully', 'success');
    loadConsumerDashboard();
    loadRequirements();
  } catch (err) {
    showToast(err.message || 'Failed to delete requirement', 'error');
  }
}

// ── Form Submissions ───────────────────────────────────────
async function handleCreateDonation(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    await api('/api/donations', {
      method: 'POST',
      body: formData
    });
    form.reset();
    closeModal('modal-create-donation');
    showToast('Donation post created! It is now visible to partner NGOs and Orphanages.', 'success');
    loadDonations();
    if (state.user && state.user.role === 'CONTRIBUTOR') loadContributorDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to create donation post', 'error');
  }
}

async function handleCreateRequirement(e) {
  e.preventDefault();
  const form = e.target;
  const quantityVal = parseInt(form.quantityNeeded ? form.quantityNeeded.value : form.quantity.value, 10);
  if (isNaN(quantityVal) || quantityVal <= 0) {
    showToast('Please enter a valid numeric quantity', 'error');
    return;
  }

  const data = {
    item: form.item.value.trim(),
    quantityNeeded: quantityVal,
    unit: form.unit ? form.unit.value.trim() : '',
    forWhom: form.forWhom.value.trim(),
    urgency: form.urgency.value,
    city: form.city.value.trim(),
    address: form.address ? form.address.value.trim() : '',
    description: form.description ? form.description.value.trim() : ''
  };

  try {
    await api('/api/requirements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    closeModal('modal-create-requirement');
    showToast('Care Center requirement published! It is now live on the Home page.', 'success');
    loadRequirements();
    loadHome();
    if (state.user && state.user.role === 'CONSUMER') loadConsumerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to create requirement', 'error');
  }
}

async function handleCreateCampaign(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    title: form.title.value,
    description: form.description.value,
    targetAmount: parseFloat(form.targetAmount.value)
  };

  try {
    await api('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    closeModal('modal-create-campaign');
    showToast('Fundraising campaign created!', 'success');
    loadCampaigns();
  } catch (err) {
    showToast(err.message || 'Failed to create campaign', 'error');
  }
}

async function handleCreateDisaster(e) {
  e.preventDefault();
  if (!state.user || state.user.role !== 'NGO') {
    showToast('Only registered NGOs are authorized to launch emergency disaster relief.', 'error');
    return;
  }
  const form = e.target;

  // parse needs
  const needs = [];
  const needInputs = form.querySelectorAll('.disaster-need-row');
  needInputs.forEach(row => {
    const item = row.querySelector('.need-item-name')?.value;
    const qty = parseInt(row.querySelector('.need-item-qty')?.value);
    if (item && qty > 0) needs.push({ itemName: item, quantityNeeded: qty, unit: 'units' });
  });

  const moneyTargetVal = parseFloat(form.targetAmount?.value || 10000);
  const data = {
    title: form.title.value,
    description: form.description.value,
    city: form.city.value,
    state: form.city.value,
    moneyTarget: moneyTargetVal,
    targetAmount: moneyTargetVal,
    needs: needs
  };

  try {
    await api('/api/disaster', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    closeModal('modal-create-disaster');
    showToast('Disaster Relief Campaign Broadcasted!', 'success');
    loadDisasterRelief();
    loadDisasterBanner();
  } catch (err) {
    showToast(err.message || 'Failed to launch relief campaign', 'error');
  }
}

function addDisasterNeedRow() {
  const container = document.getElementById('disaster-needs-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'disaster-need-row form-row mb-1';
  div.innerHTML = `
    <input type="text" class="form-control need-item-name" placeholder="Item name (e.g. Blankets)" required />
    <div class="flex gap-1">
      <input type="number" class="form-control need-item-qty" placeholder="Quantity" min="1" required />
      <button type="button" class="btn btn-sm btn-ghost" onclick="this.closest('.disaster-need-row').remove()">&times;</button>
    </div>
  `;
  container.appendChild(div);
}

// ── Initialize App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  loadDisasterBanner();
  loadHome();

  // Mobile menu toggle
  document.getElementById('btn-hamburger')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('open');
  });

  // Modal backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Role card selection in Signup
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const role = card.dataset.role;
      document.getElementById('signup-role').value = role;

      const orgField = document.getElementById('signup-org-group');
      const aadhaarBadge = document.getElementById('contributor-aadhaar-badge');
      const aadhaarGroup = document.getElementById('signup-aadhaar-group');
      const btnAadhaarOtp = document.getElementById('btn-contributor-send-otp');
      const btnStandardRegister = document.getElementById('btn-standard-register');
      const otpStep = document.getElementById('signup-aadhaar-otp-step');

      // Hide OTP step if user switches role
      if (otpStep) otpStep.classList.add('hidden');

      if (role === 'CONTRIBUTOR') {
        if (orgField) orgField.classList.add('hidden');
        if (aadhaarBadge) aadhaarBadge.classList.remove('hidden');
        if (aadhaarGroup) aadhaarGroup.classList.remove('hidden');
        if (btnAadhaarOtp) btnAadhaarOtp.classList.remove('hidden');
        if (btnStandardRegister) btnStandardRegister.classList.add('hidden');
      } else if (role === 'NGO') {
        if (orgField) orgField.classList.remove('hidden');
        if (aadhaarBadge) aadhaarBadge.classList.add('hidden');
        if (aadhaarGroup) aadhaarGroup.classList.add('hidden');
        if (btnAadhaarOtp) btnAadhaarOtp.classList.add('hidden');
        if (btnStandardRegister) btnStandardRegister.classList.remove('hidden');
      } else { // CONSUMER
        if (orgField) orgField.classList.add('hidden');
        if (aadhaarBadge) aadhaarBadge.classList.add('hidden');
        if (aadhaarGroup) aadhaarGroup.classList.add('hidden');
        if (btnAadhaarOtp) btnAadhaarOtp.classList.add('hidden');
        if (btnStandardRegister) btnStandardRegister.classList.remove('hidden');
      }
    });
  });

  // Forms event listeners
  document.getElementById('form-create-donation')?.addEventListener('submit', handleCreateDonation);
  document.getElementById('form-create-requirement')?.addEventListener('submit', handleCreateRequirement);
  document.getElementById('form-create-campaign')?.addEventListener('submit', handleCreateCampaign);
  document.getElementById('form-create-disaster')?.addEventListener('submit', handleCreateDisaster);
});
