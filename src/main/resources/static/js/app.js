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
  matches: [],
  adminStats: null,
  pendingNgos: []
};

// ── Toast Utility ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
function navigateTo(viewId) {
  state.currentView = viewId;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update active nav links
  document.querySelectorAll('.navbar-nav a, .mobile-nav a').forEach(a => {
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
  else if (viewId === 'campaigns') loadCampaigns();
  else if (viewId === 'disaster') loadDisasterRelief();
  else if (viewId === 'dashboard') loadDashboard();
  else if (viewId === 'admin') loadAdminView();
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
  const adminNav = document.getElementById('nav-admin-link');
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
      `;
    }
    if (dashboardNav) dashboardNav.classList.remove('hidden');
    if (adminNav) {
      if (user.role === 'ADMIN') adminNav.classList.remove('hidden');
      else adminNav.classList.add('hidden');
    }
  } else {
    if (guestNav) guestNav.classList.remove('hidden');
    if (userNav) userNav.classList.add('hidden');
    if (dashboardNav) dashboardNav.classList.add('hidden');
    if (adminNav) adminNav.classList.add('hidden');
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
    if (user.role === 'ADMIN') navigateTo('admin');
    else navigateTo('dashboard');
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

      banner.innerHTML = `
        <div class="disaster-banner-inner">
          <div class="disaster-banner-icon">🚨</div>
          <div class="disaster-banner-content">
            <div class="disaster-banner-title">EMERGENCY RELIEF ACTIVE: ${d.title} (${d.city})</div>
            <div class="disaster-banner-items">
              ${itemsHtml}
              <span class="disaster-banner-item" onclick="navigateTo('disaster')">View All Needs →</span>
            </div>
          </div>
          <div class="disaster-banner-actions">
            <button class="btn btn-sm btn-outline" style="color:white; border-color:white;" onclick="openDisasterDetail(${d.id})">Help Now</button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading disaster banner:', err);
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
          <div class="empty-state-icon">🛡️</div>
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

      return `
        <div class="card" style="border-left: 4px solid var(--danger);">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="badge badge-danger">EMERGENCY RELIEF</span>
              <h3 class="card-title mt-1">${d.title}</h3>
              <p class="card-subtitle">📍 ${d.city} • Organized by ${d.createdByNgoName || d.organizationName || 'Verified NGO'}</p>
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
            <button class="btn btn-sm btn-outline" onclick="openPledgeModal(${d.id})">📦 Pledge Materials</button>
            <button class="btn btn-sm btn-danger" onclick="openDonateModal(${d.campaignId}, '${d.title.replace(/'/g, "\\'")}')">❤️ Donate Funds</button>
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
      alertContainer.className = 'alert alert-warning mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">🔒</span>
        <div><strong>Restricted Access:</strong> Donations posted by contributors are routed directly to registered <strong>NGOs and Orphanages/Care Centers</strong> for collection and distribution. Please <a href="javascript:void(0)" onclick="openModal('modal-login')" class="font-bold underline" style="color:var(--primary-dark);">log in as an NGO or Care Center</a> to view incoming supplies, or log in as a Contributor to post donations.</div>
      `;
    } else if (user.role === 'CONTRIBUTOR') {
      alertContainer.className = 'alert alert-info mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">ℹ️</span>
        <div><strong>Contributor Direct Routing:</strong> Your donation posts are displayed exclusively to verified <strong>NGOs and Orphanages/Care Centers</strong> to arrange collection. Below are your personal contributions.</div>
      `;
    } else if (user.role === 'NGO') {
      alertContainer.className = 'alert alert-success mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">🤝</span>
        <div><strong>NGO Dispatch Hub:</strong> Showing available community donations contributed by donors. Review details, accept items, and coordinate collection.</div>
      `;
    } else if (user.role === 'CONSUMER') {
      alertContainer.className = 'alert alert-success mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">🏠</span>
        <div><strong>Orphanage / Care Center View:</strong> Community donations available for distribution by partner NGOs to your center.</div>
      `;
    } else if (user.role === 'ADMIN') {
      alertContainer.className = 'alert alert-info mb-3';
      alertContainer.innerHTML = `
        <span class="alert-icon">⚙️</span>
        <div><strong>Admin Telemetry:</strong> Monitoring incoming community donation posts across all cities.</div>
      `;
    }
  }

  const container = document.getElementById('donations-grid');
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="empty-state w-full">
        <div class="empty-state-icon">🔒</div>
        <h3>Donor Posts are Private to NGOs & Orphanages</h3>
        <p class="mb-3">To ensure safety and direct distribution, items donated by contributors are only displayed to verified NGOs and registered Orphanages.</p>
        <button class="btn btn-sm btn-primary" onclick="openModal('modal-login')">Sign In to View Donations</button>
      </div>
    `;
    return;
  }

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
  if (!list || list.length === 0) {
    const isContributor = state.user && state.user.role === 'CONTRIBUTOR';
    container.innerHTML = `
      <div class="empty-state w-full">
        <div class="empty-state-icon">📦</div>
        <h3>No Donations Available</h3>
        <p>${isContributor ? 'You have not posted any donations yet. Click "Create Donation Post" to contribute supplies!' : 'No community donation posts available matching these filters.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const isNgo = state.user && state.user.role === 'NGO';
    const isConsumer = state.user && state.user.role === 'CONSUMER';
    const canAccept = isNgo && item.status === 'POSTED';
    const photoHtml = item.photoPath 
      ? `<img src="${item.photoPath}" alt="${item.category}" class="card-image" onerror="this.outerHTML='<div class=\\'card-img-placeholder\\'>🎁</div>'"/>`
      : `<div class="card-img-placeholder">🎁</div>`;

    return `
      <div class="card">
        ${photoHtml}
        <div class="flex justify-between items-start mb-1">
          <span class="badge badge-primary">${item.category}</span>
          <span class="badge badge-status-${item.status}">${item.status}</span>
        </div>
        <h3 class="card-title">${item.quantity} ${item.unit || 'units'} (${item.condition} condition)</h3>
        <p class="card-subtitle mb-2">📍 ${item.city} • by ${item.contributorName}</p>
        <p class="text-sm text-muted mb-3">${item.description || 'No description provided.'}</p>
        
        <div class="card-footer flex justify-between items-center">
          <span class="text-xs text-light">${new Date(item.createdAt).toLocaleDateString()}</span>
          ${canAccept ? `
            <button class="btn btn-sm btn-primary" onclick="acceptDonationPost(${item.id})">Accept for Distribution</button>
          ` : isConsumer ? `
            <span class="text-xs text-primary font-semibold">Available for Care Center</span>
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
    await api(`/api/donations/${id}/status?status=ACCEPTED`, { method: 'PUT' });
    showToast('Donation accepted successfully! Check your NGO dashboard.', 'success');
    loadDonations();
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
      <div class="empty-state w-full">
        <div class="empty-state-icon">📋</div>
        <h3>No Requirements Listed</h3>
        <p>No community needs matching your search. Post one if you represent a shelter or care home!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(req => {
    return `
      <div class="card" style="border-top: 4px solid ${req.urgency === 'HIGH' ? 'var(--urgency-high)' : req.urgency === 'MEDIUM' ? 'var(--urgency-medium)' : 'var(--urgency-low)'}">
        <div class="flex justify-between items-start mb-2">
          <span class="badge badge-urgency-${req.urgency}">${req.urgency} URGENCY</span>
          <span class="badge badge-neutral">${req.status}</span>
        </div>
        <h3 class="card-title">${req.item}</h3>
        <p class="text-sm font-semibold text-primary mb-1">Required: ${req.quantity}</p>
        <p class="card-subtitle mb-2">📍 ${req.city} • For: <strong>${req.forWhom}</strong></p>
        <p class="text-xs text-muted mb-3">Requested by: ${req.requesterName} (${req.requesterRole})</p>
        
        <div class="card-footer flex justify-between items-center">
          <span class="text-xs text-light">${new Date(req.createdAt).toLocaleDateString()}</span>
          <button class="btn btn-sm btn-outline" onclick="openFulfillModal('${req.item}', '${req.city}')">I Can Provide This</button>
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
        <div class="empty-state-icon">🎯</div>
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

// ── Mock Payment Modal Logic ───────────────────────────────
let currentCampaignId = null;
function openDonateModal(campaignId, campaignTitle) {
  currentCampaignId = campaignId;
  const titleEl = document.getElementById('donate-modal-campaign-title');
  if (titleEl) titleEl.innerText = campaignTitle;
  document.getElementById('custom-donation-amount').value = '';
  selectPresetAmount(1000);
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

async function submitMockDonation() {
  const amount = parseFloat(document.getElementById('selected-donation-amount').value);
  const note = document.getElementById('donation-donor-note')?.value || '';
  const donorName = document.getElementById('donation-donor-name')?.value || 'Kind Donor';

  if (!amount || amount <= 0) {
    showToast('Please enter a valid donation amount', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-payment');
  if (btn) btn.classList.add('btn-loading');

  try {
    // Call backend endpoint which runs mock payment flow
    const res = await api(`/api/campaigns/${currentCampaignId}/donate`, {
      method: 'POST',
      body: JSON.stringify({ amount, note, donorName })
    });

    closeModal('modal-donate-money');
    showToast(`🎉 Payment of ₹${amount.toLocaleString()} Successful! Thank you! (Ref: ${res.paymentRef})`, 'success');
    loadCampaigns();
    if (state.currentView === 'home') loadHome();
    if (state.currentView === 'disaster') loadDisasterRelief();
  } catch (err) {
    showToast(err.message || 'Payment simulation failed', 'error');
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
    const donContainer = document.getElementById('home-recent-donations');
    if (donContainer) {
      if (state.user && (state.user.role === 'NGO' || state.user.role === 'CONSUMER' || state.user.role === 'ADMIN')) {
        const recentDonations = await api('/api/donations');
        renderDonationsGrid(donContainer, (recentDonations || []).slice(0, 3));
      } else {
        donContainer.innerHTML = `
          <div class="empty-state w-full" style="padding: 2.5rem 1rem;">
            <div class="empty-state-icon">🔒</div>
            <h3>Direct Routing to NGOs & Orphanages</h3>
            <p class="text-sm text-muted mb-3">To maintain safety and direct delivery, donation posts from contributors are exclusively routed to registered NGOs and Orphanages/Care Centers.</p>
            <div class="flex gap-1 justify-center flex-wrap">
              <button class="btn btn-sm btn-primary" onclick="openModal('modal-create-donation')">🎁 Post a Donation</button>
              <button class="btn btn-sm btn-outline" onclick="openModal('modal-login')">Sign In as NGO / Orphanage</button>
            </div>
          </div>
        `;
      }
    }

    const recentReqs = await api('/api/requirements');
    const reqContainer = document.getElementById('home-urgent-reqs');
    if (reqContainer && recentReqs) {
      renderRequirementsGrid(reqContainer, recentReqs.slice(0, 3));
    }

    const recentCamps = await api('/api/campaigns');
    const campContainer = document.getElementById('home-featured-campaigns');
    if (campContainer && recentCamps) {
      renderCampaignsGrid(campContainer, recentCamps.slice(0, 3));
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
  } else if (role === 'ADMIN') {
    navigateTo('admin');
  }
}

// 1. Contributor Dashboard
async function loadContributorDashboard() {
  const container = document.getElementById('contributor-my-donations');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const list = await api('/api/donations/my');
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎁</div>
          <h3>No donations yet</h3>
          <p>Click "Create Donation Post" to offer clothes, food, books or medicines!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const steps = ['POSTED', 'ACCEPTED', 'COLLECTED', 'DISTRIBUTED'];
      const currentIndex = steps.indexOf(item.status);
      const stepperHtml = `
        <div class="stepper">
          ${steps.map((st, i) => `
            <div class="step ${i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''}">
              <div class="step-circle">${i < currentIndex ? '✓' : i + 1}</div>
              <div class="step-label">${st}</div>
            </div>
            ${i < steps.length - 1 ? `<div class="step-line ${i < currentIndex ? 'done' : ''}"></div>` : ''}
          `).join('')}
        </div>
      `;

      return `
        <div class="card mb-3">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="badge badge-primary">${item.category}</span>
              <h3 class="card-title mt-1">${item.quantity} ${item.unit || 'units'} (${item.condition})</h3>
              <p class="card-subtitle">📍 ${item.city} • Posted on ${new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            <span class="badge badge-status-${item.status}">${item.status}</span>
          </div>
          <p class="text-sm text-muted mb-2">${item.description || 'No description'}</p>
          ${stepperHtml}
          ${(item.acceptedByNgoName || item.acceptedByName) ? `
            <div class="alert alert-info mt-2 p-2">
              <span class="text-xs">Partner NGO: <strong>${item.acceptedByNgoName || item.acceptedByName}</strong></span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// 2. NGO Dashboard
async function loadNgoDashboard() {
  loadNgoAcceptedDonations();
  loadNgoMatches();
}

async function loadNgoAcceptedDonations() {
  const container = document.getElementById('ngo-accepted-donations');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const all = await api('/api/donations');
    const myAccepted = all.filter(d => (d.acceptedByNgoName === state.user.name || d.acceptedByName === state.user.name || (d.status !== 'POSTED' && state.user.role === 'NGO')));
    if (!myAccepted || myAccepted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤝</div>
          <h3>No Accepted Donations</h3>
          <p>Browse donations and accept items you can distribute to beneficiaries!</p>
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
            <p class="card-subtitle">📍 ${item.city} • Contributor: ${item.contributorName}</p>
          </div>
          <span class="badge badge-status-${item.status}">${item.status}</span>
        </div>
        <div class="card-footer flex justify-between items-center">
          <span class="text-xs text-muted">Current Stage: <strong>${item.status}</strong></span>
          <div class="flex gap-1">
            ${item.status === 'ACCEPTED' ? `
              <button class="btn btn-sm btn-info" onclick="updateDonationStatus(${item.id}, 'COLLECTED')">Mark Collected</button>
            ` : ''}
            ${item.status === 'COLLECTED' ? `
              <button class="btn btn-sm btn-success" onclick="openProofModal(${item.id})">Mark Distributed & Upload Proof</button>
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
          <div class="empty-state-icon">💡</div>
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
          <span class="badge badge-neutral">📍 ${city}</span>
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
    await api(`/api/donations/${id}/status?status=${newStatus}`, { method: 'PUT' });
    showToast(`Status updated to ${newStatus}`, 'success');
    loadNgoAcceptedDonations();
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
    formData.append('proofPhoto', photoInput.files[0]);
  }

  try {
    await api(`/api/donations/${currentDistributeId}/distribute`, {
      method: 'POST',
      body: formData
    });
    closeModal('modal-proof-distribution');
    showToast('Proof uploaded! Donation marked as DISTRIBUTED.', 'success');
    loadNgoAcceptedDonations();
  } catch (err) {
    showToast(err.message || 'Failed to submit proof', 'error');
  }
}

// 3. Consumer Dashboard
async function loadConsumerDashboard() {
  const container = document.getElementById('consumer-my-requirements');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const list = await api('/api/requirements/my');
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No Requirements Posted</h3>
          <p>Click "Post Requirement" to request food, clothes, or supplies for your care center!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(req => `
      <div class="card mb-3">
        <div class="flex justify-between items-start mb-2">
          <div>
            <span class="badge badge-urgency-${req.urgency}">${req.urgency} URGENCY</span>
            <h3 class="card-title mt-1">${req.item} (${req.quantity})</h3>
            <p class="card-subtitle">📍 ${req.city} • For: ${req.forWhom}</p>
          </div>
          <span class="badge badge-neutral">${req.status}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Admin Dashboard ────────────────────────────────────────
async function loadAdminView() {
  if (!state.user || state.user.role !== 'ADMIN') {
    navigateTo('home');
    showToast('Admin access required', 'error');
    return;
  }

  try {
    const stats = await api('/api/admin/stats');
    state.adminStats = stats;

    const totalUsers = (stats.totalContributors || 0) + (stats.totalNgos || 0) + (stats.totalConsumers || 0);
    document.getElementById('stat-total-users').innerText = stats.totalUsers || totalUsers || 0;
    document.getElementById('stat-total-donations').innerText = stats.totalDonationPosts || stats.totalDonations || 0;
    document.getElementById('stat-total-campaigns').innerText = stats.activeCampaigns || stats.totalCampaigns || 0;
    document.getElementById('stat-total-raised').innerText = `₹${(stats.totalMoneyRaised || 0).toLocaleString()}`;

    // Load category breakdown
    const catContainer = document.getElementById('admin-category-breakdown');
    const catMap = stats.donationsByCategory || stats.itemsByCategory || {};
    if (catContainer) {
      catContainer.innerHTML = Object.entries(catMap).map(([cat, count]) => `
        <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--border);">
          <span class="font-medium">${cat}</span>
          <span class="badge badge-primary">${count} items</span>
        </div>
      `).join('');
    }

    // Load pending NGOs
    loadPendingNgos();
  } catch (err) {
    showToast(err.message || 'Failed to load admin stats', 'error');
  }
}

async function loadPendingNgos() {
  const container = document.getElementById('admin-pending-ngos-tbody');
  if (!container) return;
  try {
    const pending = await api('/api/admin/ngos/pending');
    state.pendingNgos = pending || [];
    if (state.pendingNgos.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No NGOs pending verification. All verified! ✓</td></tr>`;
      return;
    }

    container.innerHTML = state.pendingNgos.map(ngo => `
      <tr>
        <td><strong>${ngo.organizationName || ngo.name}</strong></td>
        <td>${ngo.email}</td>
        <td>${ngo.city || '-'}</td>
        <td><span class="badge badge-warning">Pending</span></td>
        <td>
          <button class="btn btn-sm btn-success" onclick="verifyNgo(${ngo.id})">Verify NGO</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" class="text-danger py-2">Error: ${err.message}</td></tr>`;
  }
}

async function verifyNgo(id) {
  try {
    await api(`/api/admin/users/${id}/verify`, { method: 'PUT' });
    showToast('NGO account verified! They can now launch campaigns.', 'success');
    loadPendingNgos();
    loadAdminView();
  } catch (err) {
    showToast(err.message || 'Failed to verify NGO', 'error');
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
  const data = {
    item: form.item.value,
    quantity: form.quantity.value,
    forWhom: form.forWhom.value,
    urgency: form.urgency.value,
    city: form.city.value
  };

  try {
    await api('/api/requirements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    closeModal('modal-create-requirement');
    showToast('Requirement post published!', 'success');
    loadRequirements();
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
    showToast(err.message || 'Failed to create campaign (Note: NGOs must be verified by Admin)', 'error');
  }
}

async function handleCreateDisaster(e) {
  e.preventDefault();
  const form = e.target;

  // parse needs
  const needs = [];
  const needInputs = form.querySelectorAll('.disaster-need-row');
  needInputs.forEach(row => {
    const item = row.querySelector('.need-item-name')?.value;
    const qty = parseInt(row.querySelector('.need-item-qty')?.value);
    if (item && qty > 0) needs.push({ itemName: item, quantityNeeded: qty });
  });

  const data = {
    title: form.title.value,
    description: form.description.value,
    city: form.city.value,
    targetAmount: parseFloat(form.targetAmount.value || 0),
    needs: needs
  };

  try {
    await api('/api/disaster', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    closeModal('modal-create-disaster');
    showToast('🚨 Disaster Relief Campaign Launched!', 'success');
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
      <button type="button" class="btn btn-sm btn-ghost" onclick="this.closest('.disaster-need-row').remove()">✕</button>
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
      if (orgField) {
        if (role === 'NGO') orgField.classList.remove('hidden');
        else orgField.classList.add('hidden');
      }
    });
  });

  // Forms event listeners
  document.getElementById('form-create-donation')?.addEventListener('submit', handleCreateDonation);
  document.getElementById('form-create-requirement')?.addEventListener('submit', handleCreateRequirement);
  document.getElementById('form-create-campaign')?.addEventListener('submit', handleCreateCampaign);
  document.getElementById('form-create-disaster')?.addEventListener('submit', handleCreateDisaster);
});
