// Amber的活动手札 - 网页版 v4 云端版（Supabase）
// 活动管理 + 多日期范围 + 签到 + 薪资结算 + 积分兑换

const SUPABASE_URL = 'https://shlpqpscmvdxkxquqibb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobHBxcHNjbXZkeGt4cXVxaWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDg3NTIsImV4cCI6MjA5NTMyNDc1Mn0.Ba1SgbYw6ZRDFMKib7s8MLCey2IMJc17TQ0zzO8RA60';

const DB = { KEY: 'nadb_activities', USER_KEY: 'nadb_user', USERS_KEY: 'nadb_users', APPS_KEY: 'nadb_apps', ADMIN_KEY: 'nadb_admin' };

// ========== State ==========
let state = { user: null, view: 'home', data: null, filter: 'all', apps: [], users: [], activities: [], rewards: [] };

// ========== Supabase REST helpers ==========
async function sbGet(table, params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }
  });
  if (!r.ok) { const t = await r.text(); console.error('sbGet error', r.status, t); return []; }
  return r.json();
}

async function sbPost(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text(); console.error('sbPost error', r.status, t); return null; }
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

async function sbPut(table, params, body) {
  const qs = '?' + new URLSearchParams(params).toString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text(); console.error('sbPut error', r.status, t); return null; }
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

async function sbDelete(table, params) {
  const qs = '?' + new URLSearchParams(params).toString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }
  });
  return r.ok;
}

// ========== Init ==========
async function init() {
  // Ensure admin account exists
  let adminArr = await sbGet('admin', { name: 'eq.管理员', limit: 1 });
  if (!adminArr || adminArr.length === 0) {
    await sbPost('admin', { name: '管理员', phone: '13800000000', password: 'admin123', invitecode: 'naidezhuan2026' });
  }
  // Seed demo activities if none exist
  let acts = await sbGet('activities', { status: 'eq.active', limit: 1 });
  if (!acts || acts.length === 0) {
    const demoActs = [
      { id: 1001, title: '周末朝阳公园散步', location: '朝阳公园', content: '周末一起逛公园散步，放松心情，适合带相机。', points: 50, people: 5, enrolled: 2, date: '2026-05-24', time: '09:00-11:00', status: 'active', publisher: 'Amber', creator: true },
      { id: 1002, title: '798咖啡品鉴小聚', location: '798艺术区', content: '一起逛798，找家咖啡馆坐下来聊最近的生活。', points: 80, people: 6, enrolled: 3, date: '2026-05-28', time: '14:00-17:00', status: 'active', publisher: 'Amber', creator: true },
      { id: 1003, title: '周末徒步+山顶品酒', location: '香山', content: '爬爬山，到山顶一起开一瓶马德拉，看风景聊天。', points: 100, people: 8, enrolled: 1, date: '2026-05-30', time: '08:00-12:00', status: 'active', publisher: 'Amber', creator: true }
    ];
    for (const a of demoActs) await sbPost('activities', a);
  }
  // Seed rewards table if empty
  const emptyRewards = await sbGet('rewards', { limit: 1 });
  if (!emptyRewards || emptyRewards.length === 0) {
    const demoRewards = [
      { id: 1, name: '星巴克咖啡券', points_cost: 200, stock: 10, status: 'active', created_at: new Date().toISOString() },
      { id: 2, name: '电影票一张', points_cost: 300, stock: 5, status: 'active', created_at: new Date().toISOString() },
      { id: 3, name: '50元京东卡', points_cost: 500, stock: 3, status: 'active', created_at: new Date().toISOString() }
    ];
    for (const r of demoRewards) await sbPost('rewards', r);
  }
}

// ========== Auth ==========
function getCurrentUser() {
  if (state.user) return state.user;
  try { return JSON.parse(localStorage.getItem(DB.USER_KEY)) || null; } catch { return null; }
}

function saveUserToLocal(u) { localStorage.setItem(DB.USER_KEY, JSON.stringify(u)); }

async function login(name, isAdmin, pwd) {
  if (isAdmin) {
    const admins = await sbGet('admin', { name: 'eq.管理员', limit: 1 });
    const admin = admins[0];
    if (!admin) return '管理员未初始化';
    if (pwd !== admin.password) return '密码错误';
    const u = { name: admin.name, role: 'admin', phone: admin.phone };
    state.user = u; saveUserToLocal(u); render(); return null;
  }
  if (!name.trim()) return '请输入昵称';
  let allUsers = await sbGet('users', {});
  let users = allUsers.filter(x => x.name === name);
  let u = users[0];
  if (!u) {
    u = { name: name.trim(), points: 0, total_points: 0, total_salary: 0, completed_count: 0, joined: new Date().toISOString(), completed: 0 };
    const created = await sbPost('users', u);
    if (created && created.id) u.id = created.id;
  }
  u.role = 'user';
  state.user = u; saveUserToLocal(u); render(); return null;
}

function logout() { localStorage.removeItem(DB.USER_KEY); state.user = null; navigate('home'); }

// ========== Data helpers ==========
async function getActivities() {
  const r = await sbGet('activities', {});
  return r || [];
}

async function getUsers() {
  const r = await sbGet('users', {});
  return r || [];
}

async function getApps() {
  const r = await sbGet('apps', {});
  return r || [];
}

async function getRewards() {
  const r = await sbGet('rewards', { status: 'eq.active' });
  return r || [];
}

function getMyEnrolled() {
  const u = getCurrentUser();
  return u ? JSON.parse(localStorage.getItem('enrolled_' + u.name) || '[]') : [];
}

function saveMyEnrolled(arr) {
  const u = getCurrentUser();
  if (u) localStorage.setItem('enrolled_' + u.name, JSON.stringify(arr));
}

// ========== Router ==========
function navigate(view, data) {
  state.view = view;
  state.data = data;
  render();
}

// ========== Render ==========
async function render() {
  state.activities = await getActivities();
  state.users = await getUsers();
  state.apps = await getApps();
  state.rewards = await getRewards();

  const app = document.getElementById('app');
  const user = getCurrentUser();
  let html = '';

  if (!user) {
    html = loginPage();
  } else {
    switch (state.view) {
      case 'home': html = homePage(); break;
      case 'detail': html = detailPage(); break;
      case 'my': html = myPage(); break;
      case 'points': html = pointsPage(); break;
      case 'profile': html = profilePage(); break;
      case 'publish': html = adminPublish(); break;
      case 'admin': html = adminPage(); break;
      case 'admin_tasks': html = adminTasks(); break;
      case 'admin_apps': html = adminApps(); break;
      case 'admin_users': html = adminUsers(); break;
      case 'admin_rewards': html = adminRewards(); break;
      case 'checkin': html = checkinPage(); break;
      case 'leave': html = leavePage(); break;
      case 'salary_apply': html = salaryApplyPage(); break;
      case 'salary_slip': html = salarySlipPage(); break;
      case 'rewards': html = rewardsPage(); break;
      default: html = homePage();
    }
  }

  if (user) html += tabBar();
  app.innerHTML = html;
  bindEvents();
}

// ========== Login Page ==========
function loginPage() {
  return `
  <div class="login-box">
    <div class="logo">📒</div>
    <h1>那得赚一笔</h1>
    <p>和朋友一起，记录每一次出发</p>
    <div class="form-group"><input class="form-input" id="loginName" placeholder="输入昵称" maxlength="20"></div>
    <div class="form-group" id="adminPwdGroup" style="display:none">
      <input class="form-input" id="loginPwd" type="password" placeholder="输入管理员密码">
    </div>
    <div class="login-btn-group">
      <button class="btn btn-primary" id="loginBtn">进入</button>
    </div>
    <div style="text-align:center;margin-top:12px">
      <span id="adminToggle" style="font-size:13px;color:var(--primary);cursor:pointer">管理员登录</span>
    </div>
    <div id="loginError" class="login-error"></div>
  </div>`;
}

// ========== Home Page ==========
function homePage() {
  const acts = state.activities.filter(a => String(a.status) === 'active');
  const enrolled = getMyEnrolled();
  let html = `<div class="header"><h1>📒 那得赚一笔</h1><p>看看朋友们最近在玩什么</p></div>`;

  if (!acts.length) {
    html += `<div class="empty"><div class="icon">📭</div><p>暂无进行中的活动</p></div>`;
  } else {
    acts.forEach(a => {
      const e = enrolled.includes(a.id);
      // Determine date display
      let dateDisplay = a.date || '';
      if (a.start_date && a.end_date) {
        dateDisplay = a.start_date + ' 至 ' + a.end_date;
      }
      html += `<div class="card" onclick="navigate('detail',${a.id})">
        <div class="card-title">${a.title}</div>
        <div class="card-meta">📍 ${a.location || ''}</div>
        <div class="card-meta">📅 ${dateDisplay} ${a.time || ''}</div>
        <div class="card-footer">
          <span>👥 ${a.enrolled || 0}/${a.people || 0}人</span>
          <span class="tag">进行中</span>
        </div>
        ${e ? '<div class="btn btn-gray" style="margin:10px 0 0">✅ 已参与</div>'
          : '<div class="btn btn-primary" style="margin:10px 0 0" data-enroll="' + a.id + '" onclick="event.stopPropagation();enroll(' + a.id + ')">🎯 我想去</div>'}
      </div>`;
    });
  }

  const u = getCurrentUser();
  if (u && u.role === 'admin') {
    html += `<div style="text-align:center;padding:10px;color:var(--primary);cursor:pointer" onclick="navigate('admin')">🔐 管理后台</div>`;
  }
  return html;
}

// ========== Detail Page ==========
function detailPage() {
  const a = state.activities.find(x => x.id === state.data);
  const enrolled = getMyEnrolled();
  if (!a) return homePage();
  const e = enrolled.includes(a.id);

  // Date display
  let dateDisplay = a.date || '';
  if (a.start_date && a.end_date) {
    dateDisplay = a.start_date + ' 至 ' + a.end_date;
  }

  // Time display
  let timeDisplay = a.time || '';
  if (a.time_slots && typeof a.time_slots === 'string') {
    try {
      const slots = JSON.parse(a.time_slots);
      if (Array.isArray(slots) && slots.length > 0) {
        timeDisplay = slots.join(' / ');
      }
    } catch (e) {}
  }

  return `<div style="padding:16px">
    <div style="margin-bottom:12px">
      <span style="cursor:pointer;color:var(--primary)" onclick="navigate('home')">← 返回</span>
    </div>
    <div class="card" style="margin:0">
      <div class="card-title" style="font-size:20px">${a.title}</div>
      <div style="margin:8px 0"><span class="tag">进行中</span></div>
      <div class="card-meta">📍 ${a.location || ''}</div>
      <div class="card-meta">📅 ${dateDisplay}</div>
      ${timeDisplay ? `<div class="card-meta">⏰ ${timeDisplay}</div>` : ''}
      <div class="card-meta">👥 ${a.enrolled || 0}/${a.people || 0}人</div>
      <div class="card-meta">🎯 积分 +${a.points || 0}</div>
      ${a.require_checkin ? '<div class="card-meta">📍 需要现场签到</div>' : ''}
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="font-weight:500;margin-bottom:6px">📝 内容</div>
        <div class="card-meta">${a.content || ''}</div>
      </div>
      <div style="margin-top:12px"><div class="card-meta">👤 ${a.publisher || ''}</div></div>
    </div>
    ${e ? '<div class="btn btn-gray">✅ 已参与</div>' : '<div class="btn btn-primary" onclick="enroll(' + a.id + ')">🎯 我想参与</div>'}
  </div>`;
}

// ========== My Page ==========
function myPage() {
  const u = getCurrentUser();
  const enrolled = getMyEnrolled();
  const acts = state.activities.filter(a => enrolled.includes(a.id));
  const apps = state.apps.filter(a => a.username === u.name);

  let html = `<div class="page-title">📋 我的记录</div>
    <div style="padding:8px 16px 0;font-size:14px;color:var(--text-secondary)">查看所有参与记录</div>`;

  html += `<div class="filter-tabs">${['all', 'pending', 'approved', 'checkedin', 'completed', 'paid'].map(f =>
    `<span class="filter-tab ${state.filter === f ? 'active' : ''}" onclick="setMyFilter('${f}')">${
      { all: '全部', pending: '待审核', approved: '已通过', checkedin: '已签到', completed: '已完成', paid: '已发放' }[f]
    }</span>`
  ).join('')}</div>`;

  let filtered = apps;
  if (state.filter === 'pending') filtered = apps.filter(a => String(a.status) === '待审核');
  else if (state.filter === 'approved') filtered = apps.filter(a => String(a.status) === '已通过');
  else if (state.filter === 'checkedin') filtered = apps.filter(a => String(a.status) === '已签到');
  else if (state.filter === 'completed') filtered = apps.filter(a => String(a.status) === '已完成');
  else if (state.filter === 'paid') filtered = apps.filter(a => String(a.status) === '已发放');
  else filtered = apps;

  if (!filtered.length) {
    html += `<div class="empty"><div class="icon">📭</div><p>暂无记录</p></div>`;
  } else {
    filtered.forEach(app => {
      const task = state.activities.find(t => String(t.id) === String(app.taskid));
      const statusLabel = app.status || '';
      let actionBtns = '';

      // Check-in button: if activity requires checkin and status is 已通过 or 已签到
      if (task && task.require_checkin && (String(app.status) === '已通过' || String(app.status) === '已签到')) {
        if (String(app.status) === '已签到') {
          actionBtns += `<span class="tag" style="background:#e8f5e9;color:#2e7d32">✅ 已签到</span>`;
        } else {
          actionBtns += `<button class="btn-small" onclick="doCheckin(${app.id})">📍 签到</button>`;
        }
      }

      // Salary apply button: if status is 已完成 and no salaryconfirmed yet
      if (String(app.status) === '已完成' && !app.salaryconfirmed && String(app.status) !== '待发放' && String(app.status) !== '已发放') {
        actionBtns += `<button class="btn-small" onclick="navigate('salary_apply',${app.id})">💰 申请薪资</button>`;
      }

      // Salary slip button: if salary is confirmed
      if (app.confirmed_salary || app.salaryconfirmed) {
        actionBtns += `<button class="btn-small" style="background:var(--green)" onclick="navigate('salary_slip',${app.id})">📄 薪资条</button>`;
      }

      html += `<div class="card" onclick="navigate('detail',${app.taskid})">
        <div class="card-title">${app.tasktitle || '活动'}</div>
        <div class="card-meta">📍 ${task?.location || ''} · 📅 ${app.selected_date || task?.date || ''}</div>
        ${app.selected_slot ? `<div class="card-meta">⏰ ${app.selected_slot}</div>` : ''}
        <div class="card-footer">
          <span class="card-meta">🎯 +${app.taskpay || 0}积分</span>
          <span class="tag ${statusClass(statusLabel)}">${statusLabel}</span>
        </div>
        ${actionBtns ? `<div style="margin-top:8px">${actionBtns}</div>` : ''}
      </div>`;
    });
  }

  if (u && u.role === 'admin') {
    html += `<div style="text-align:center;padding:10px;color:var(--primary);cursor:pointer" onclick="navigate('publish')">➕ 发布新活动</div>`;
  }
  return html;
}

function statusClass(s) {
  const map = {
    '待审核': '', '已通过': '', '已拒绝': 'tag-gray',
    '已签到': '', '已完成': '', '待发放': '', '已发放': 'tag-gray'
  };
  return map[s] || '';
}

// ========== Points Page ==========
function pointsPage() {
  const u = getCurrentUser();
  const userRec = state.users.find(x => (x.id || x.name) === (u.id || u.name)) || {};
  const totalPoints = userRec.total_points || u.points || 0;
  const totalSalary = userRec.total_salary || 0;
  const completedCount = userRec.completed_count || 0;

  // Find confirmed salary total
  const myApps = state.apps.filter(a => (a.userid === (u.id || u.name)) && a.confirmed_salary);
  const confirmedSalarySum = myApps.reduce((s, a) => s + (parseFloat(a.confirmed_salary) || 0), 0);

  return `<div class="points-header">
      <div class="points-label">我的积分</div>
      <div class="points-num">${totalPoints}</div>
      <div class="points-label">参与活动获得的虚拟积分 🎯</div>
    </div>
    <div class="card" style="margin:0 16px 16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="text-align:center;padding:12px;background:#f8f9fc;border-radius:8px">
          <div style="font-size:22px;font-weight:700;color:var(--primary)">${totalSalary.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--text-secondary)">💰 累计薪资(元)</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f8f9fc;border-radius:8px">
          <div style="font-size:22px;font-weight:700;color:var(--green)">${completedCount}</div>
          <div style="font-size:12px;color:var(--text-secondary)">✅ 完成次数</div>
        </div>
      </div>
    </div>
    <div class="page-title">🎁 积分商城</div>
    <div style="padding:0 16px">
      <div class="card" style="cursor:pointer" onclick="navigate('rewards')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:600">🎁 兑换奖品</div><div style="font-size:13px;color:var(--text-secondary)">用积分换好物</div></div>
          <span style="font-size:20px">›</span>
        </div>
      </div>
    </div>
    <div class="page-title">📊 积分明细</div>
    <div class="empty"><div class="icon">🏆</div><p>继续参与活动赚积分吧~</p></div>`;
}

// ========== Rewards Page ==========
function rewardsPage() {
  const u = getCurrentUser();
  const userRec = state.users.find(x => (x.id || x.name) === (u.id || u.name)) || {};
  const myPoints = userRec.total_points || u.points || 0;

  let html = `<div class="page-title">🎁 积分商城</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('points')">← 返回</span></div>
    <div style="text-align:center;padding:12px 16px;background:white;margin:10px 16px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      <div style="font-size:13px;color:var(--text-secondary)">我的积分</div>
      <div style="font-size:32px;font-weight:700;color:var(--primary)">${myPoints}</div>
    </div>`;

  const rewards = state.rewards.filter(r => r.status === 'active');
  if (!rewards.length) {
    html += `<div class="empty"><div class="icon">🎁</div><p>暂无奖品</p></div>`;
  } else {
    rewards.forEach(r => {
      const canAfford = myPoints >= (r.points_cost || 0);
      const outOfStock = (r.stock || 0) <= 0;
      html += `<div class="card">
        <div class="card-title">${r.name || ''}</div>
        <div class="card-meta">🎯 需要 ${r.points_cost || 0} 积分 · 剩余 ${r.stock || 0} 件</div>
        <div style="margin-top:10px">
          ${outOfStock ? `<span class="tag tag-gray">已兑完</span>` :
            canAfford ? `<button class="btn-small" style="background:var(--primary)" onclick="redeemReward(${r.id})">🏆 兑换</button>` :
            `<span class="tag tag-gray">积分不足</span>`}
        </div>
      </div>`;
    });
  }
  return html;
}

// ========== Salary Apply Page ==========
function salaryApplyPage() {
  const appId = state.data;
  const appRec = state.apps.find(a => a.id === appId);
  if (!appRec) return myPage();

  return `<div class="page-title">💰 申请薪资</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('my')">← 返回</span></div>
    <div class="card" style="margin:10px 16px">
      <div class="card-title">${appRec.tasktitle || '活动'}</div>
      <div class="card-meta">📅 ${appRec.selected_date || ''} ${appRec.selected_slot || ''}</div>
      <div class="card-meta">💰 约定薪资：${appRec.taskpay || 0}元</div>
    </div>
    <div class="form-group" style="margin:12px 16px">
      <label class="form-label">备注（选填）</label>
      <textarea class="form-input" id="salaryNote" style="min-height:80px" placeholder="如有补充说明，请填写..."></textarea>
    </div>
    <div class="btn btn-primary" onclick="submitSalaryApply(${appId})" style="margin:0 16px">提交申请</div>`;
}

// ========== Salary Slip Page ==========
function salarySlipPage() {
  const appId = state.data;
  const appRec = state.apps.find(a => a.id === appId);
  if (!appRec) return myPage();

  return `<div style="padding:16px">
    <div style="margin-bottom:12px">
      <span style="cursor:pointer;color:var(--primary)" onclick="navigate('my')">← 返回</span>
    </div>
    <div class="card" style="margin:0;background:linear-gradient(135deg,#ff6b6b,#ff8e8e);color:white">
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:14px;opacity:0.8">💰 薪资确认条</div>
        <div style="font-size:36px;font-weight:700;margin-top:8px">¥${appRec.confirmed_salary || '—'}</div>
        <div style="font-size:13px;opacity:0.8;margin-top:4px">${appRec.tasktitle || ''}</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:12px;margin-top:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;opacity:0.8">日期</span>
          <span style="font-size:13px">${appRec.selected_date || ''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;opacity:0.8">时段</span>
          <span style="font-size:13px">${appRec.selected_slot || ''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;opacity:0.8">积分</span>
          <span style="font-size:13px">+${appRec.confirmed_points || appRec.taskpay || 0}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;opacity:0.8">确认时间</span>
          <span style="font-size:13px">${appRec.confirmed_at ? appRec.confirmed_at.slice(0, 16).replace('T', ' ') : '—'}</span>
        </div>
        ${appRec.salary_apply_note ? `<div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;opacity:0.8">备注</span>
          <span style="font-size:13px">${appRec.salary_apply_note}</span>
        </div>` : ''}
      </div>
      ${appRec.salary_screenshot ? `<div style="margin-top:12px;text-align:center">
        <div style="font-size:12px;opacity:0.8">凭证截图</div>
        <div style="margin-top:6px;font-size:13px">${appRec.salary_screenshot}</div>
      </div>` : ''}
    </div>
    <div class="card" style="margin:10px 16px;text-align:center">
      <div style="font-size:12px;color:var(--text-secondary)">点击复制薪资信息</div>
      <button class="btn btn-primary" style="margin:8px 0" onclick="copySalarySlip(${appId})">📋 复制信息</button>
    </div>
  </div>`;
}

// ========== Profile Page ==========
function profilePage() {
  const u = getCurrentUser();
  const isAdmin = u && u.role === 'admin';
  const userRec = state.users.find(x => (x.id || x.name) === (u.id || u.name)) || {};
  return `<div class="page-title">⚙️ 设置</div>
    <div class="card" style="text-align:center">
      <div style="font-size:40px;margin-bottom:8px">👤</div>
      <div style="font-size:18px;font-weight:600">${u.name || ''}</div>
      <div class="card-meta">${isAdmin ? '🔐 管理员' : '👤 用户'}</div>
      <div class="card-meta">积分：${userRec.total_points || u.points || 0}</div>
      <div class="card-meta">累计薪资：${userRec.total_salary || 0}元</div>
      <div class="card-meta">完成 ${userRec.completed_count || 0} 次</div>
    </div>
    ${isAdmin ? `<div class="card" style="cursor:pointer" onclick="navigate('admin')">
      <span>🔐 管理后台</span><span style="float:right">›</span>
    </div>` : ''}
    <div class="card" style="cursor:pointer" onclick="logout()">
      <span style="color:var(--primary)">🚪 退出登录</span>
    </div>`;
}

// ========== Admin Pages ==========
function adminPage() {
  const acts = state.activities;
  const users = state.users;
  const apps = state.apps;
  const pending = apps.filter(a => String(a.status) === '待审核').length;
  const salaryPending = apps.filter(a => String(a.status) === '已完成').length;
  return `<div class="page-title">🔐 管理后台</div>
    <div class="stats-row">
      <div class="stat-card" onclick="navigate('publish')"><div class="stat-icon">📝</div><div>发布活动</div></div>
      <div class="stat-card" onclick="navigate('admin_tasks')"><div class="stat-icon">📋</div><div>活动管理</div></div>
      <div class="stat-card" onclick="navigate('admin_apps')"><div class="stat-icon">👥</div><div>审核 (${pending})</div></div>
      <div class="stat-card" onclick="navigate('admin_users')"><div class="stat-icon">👤</div><div>用户</div></div>
    </div>
    <div class="stats-row" style="padding-top:0">
      <div class="stat-card" onclick="navigate('admin_rewards')"><div class="stat-icon">🎁</div><div>奖品管理</div></div>
      <div class="stat-card" onclick="navigate('admin_apps')"><div class="stat-icon">💰</div><div>薪资结算 (${salaryPending})</div></div>
    </div>
    <div class="card">
      <div style="font-weight:600;margin-bottom:12px">📊 数据概览</div>
      <div class="overview-grid">
        <div>📋 ${acts.length} 活动</div>
        <div>👥 ${users.length} 用户</div>
        <div>⏳ ${pending} 待审</div>
        <div>✅ ${apps.filter(a => a.status === '已完成').length} 待结算</div>
      </div>
    </div>
    <div class="card" style="cursor:pointer" onclick="navigate('home')">← 返回首页</div>`;
}

function adminTasks() {
  const acts = state.activities;
  let html = `<div class="page-title">📋 活动管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>`;
  if (!acts.length) { html += `<div class="empty"><div class="icon">📭</div><p>暂无活动</p></div>`; }
  else {
    acts.forEach(a => {
      html += `<div class="card">
        <div class="card-title">${a.title}</div>
        <div class="card-meta">👥 ${a.enrolled || 0}/${a.people || 0} · 📅 ${a.start_date && a.end_date ? (a.start_date + ' 至 ' + a.end_date) : (a.date || '未设置')}</div>
        ${a.time_slots ? `<div class="card-meta">⏰ ${(function(){try{return JSON.parse(a.time_slots).join(' / ');}catch{return a.time_slots;}})()}</div>` : ''}
        <div class="card-footer">
          <span class="tag ${String(a.status) === 'active' ? '' : 'tag-gray'}">${String(a.status) === 'active' ? '进行中' : '已结束'}</span>
          <span>
            ${String(a.status) === 'active' ? `<button class="btn-small" onclick="endActivity(${a.id})">⏹ 结束</button>` : ''}
            <button class="btn-small btn-danger" onclick="delActivity(${a.id})">🗑 删除</button>
          </span>
        </div>
      </div>`;
    });
  }
  return html;
}

function adminApps() {
  const apps = state.apps;
  const acts = state.activities;
  const pendingCount = apps.filter(a => String(a.status) === '待审核').length;
  const salaryCount = apps.filter(a => String(a.status) === '已完成').length;

  let html = `<div class="page-title">👥 审核管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>
    <div class="filter-tabs" style="padding:8px 16px">
      ${['all', 'pending', 'salary', 'paid'].map(f =>
        `<span class="filter-tab ${state.filter === f ? 'active' : ''}" onclick="setAppFilter('${f}')">${
          { all: '全部', pending: `待审核(${pendingCount})`, salary: `待结算(${salaryCount})`, paid: '已发放' }[f]
        }</span>`
      ).join('')}
    </div>`;

  let filtered = apps;
  if (state.filter === 'pending') filtered = apps.filter(a => String(a.status) === '待审核');
  else if (state.filter === 'salary') filtered = apps.filter(a => String(a.status) === '已完成');
  else if (state.filter === 'paid') filtered = apps.filter(a => String(a.status) === '已发放');

  if (!filtered.length) {
    html += `<div class="empty"><div class="icon">📭</div><p>暂无记录</p></div>`;
  } else {
    filtered.forEach(a => {
      const task = acts.find(t => String(t.id) === String(a.taskid));
      html += `<div class="card">
        <div class="card-title">${a.username || ''} → ${a.tasktitle || ''}</div>
        <div class="card-meta">📅 ${a.selected_date || a.appliedat?.slice(0, 10) || ''} ${a.selected_slot || ''}</div>
        <div class="card-meta">💰 约定薪资: ${a.taskpay || 0}元 · 状态: ${a.status || ''}</div>
        ${a.salary_apply_note ? `<div class="card-meta">📝 申请备注: ${a.salary_apply_note}</div>` : ''}
        <div class="card-footer">
          ${String(a.status) === '待审核' ?
            `<span>
              <button class="btn-small" onclick="approveApp(${a.id})">✅ 通过</button>
              <button class="btn-small btn-danger" onclick="rejectApp(${a.id})">❌ 拒绝</button>
            </span>` :
          (String(a.status) === '已完成') ?
            `<span>
              <button class="btn-small" style="background:var(--green)" onclick="showSalaryConfirmForm(${a.id})">💰 结算薪资</button>
              <button class="btn-small" onclick="completeActivity(${a.id})">✅ 点完成</button>
            </span>` :
          (String(a.status) === '待发放') ?
            `<span>
              <button class="btn-small" style="background:var(--green)" onclick="showSalaryConfirmForm(${a.id})">💰 确认薪资</button>
            </span>` :
          (String(a.status) === '已发放') ?
            `<span>
              <span class="tag tag-gray">已发放 ¥${a.confirmed_salary || 0}</span>
              <button class="btn-small" onclick="navigate('salary_slip',${a.id})">📄 查看</button>
            </span>` :
            `<span class="tag">${a.status || ''}</span>`}
        </div>
      </div>`;
    });
  }
  return html;
}

function adminUsers() {
  const users = state.users;
  const apps = state.apps;
  let html = `<div class="page-title">👤 用户管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>`;
  if (!users.length) { html += `<div class="empty"><div class="icon">👤</div><p>暂无用户</p></div>`; }
  else {
    users.forEach(u => {
      const completedCount = apps.filter(a => (a.userid === u.name || a.userid === u.id) && (a.status === '已完成' || a.status === '已发放')).length;
      const totalSalary = apps.filter(a => (a.userid === u.name || a.userid === u.id) && a.confirmed_salary)
        .reduce((s, a) => s + (parseFloat(a.confirmed_salary) || 0), 0);
      html += `<div class="card">
        <div class="card-title">${u.name || ''}</div>
        <div class="card-meta">
          🎯 积分: ${u.total_points || u.points || 0} ·
          💰 累计薪资: ¥${u.total_salary || totalSalary.toFixed(2)} ·
          ✅ 完成: ${u.completed_count || completedCount} 次
        </div>
        <div class="card-meta">📅 加入: ${(u.joined || '').slice(0, 10)}</div>
      </div>`;
    });
  }
  return html;
}

function adminRewards() {
  const rewards = state.rewards;
  let html = `<div class="page-title">🎁 奖品管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>
    <div style="padding:8px 16px">
      <button class="btn btn-primary" style="width:100%;margin:0" onclick="showAddRewardForm()">➕ 添加奖品</button>
    </div>`;
  if (!rewards.length) { html += `<div class="empty"><div class="icon">🎁</div><p>暂无奖品</p></div>`; }
  else {
    rewards.forEach(r => {
      html += `<div class="card">
        <div class="card-title">${r.name || ''}</div>
        <div class="card-meta">🎯 积分: ${r.points_cost || 0} · 库存: ${r.stock || 0}</div>
        <div class="card-footer">
          <span class="tag ${String(r.status) === 'active' ? '' : 'tag-gray'}">${String(r.status) === 'active' ? '上架中' : '已下架'}</span>
          <span>
            <button class="btn-small" onclick="toggleRewardStatus(${r.id},'${String(r.status) === 'active' ? 'inactive' : 'active'}')">${String(r.status) === 'active' ? '下架' : '上架'}</button>
          </span>
        </div>
      </div>`;
    });
  }
  return html;
}

function adminPublish() {
  return `<div class="page-title">📝 发布新活动</div>
    <div style="padding:0 16px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>
    <div class="form-group"><label class="form-label">活动标题 *</label><input class="form-input" id="pubTitle" maxlength="50" placeholder="如：周末朝阳公园散步"></div>
    <div class="form-group"><label class="form-label">📍 地点 *</label><input class="form-input" id="pubLocation" placeholder="如：朝阳公园东门"></div>
    <div class="form-group">
      <label class="form-label">📅 日期范围 *</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input" id="pubStartDate" type="date" style="flex:1">
        <span>至</span>
        <input class="form-input" id="pubEndDate" type="date" style="flex:1">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">⏰ 时间段（多个用英文逗号隔开）</label>
      <input class="form-input" id="pubTimeSlots" placeholder="如：09:00-11:00, 14:00-17:00">
      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">多个时段用英文逗号分隔，如：09:00-11:00, 14:00-17:00</div>
    </div>
    <div class="form-group"><label class="form-label">👥 人数 *</label><input class="form-input" id="pubPeople" type="number" min="1" value="10"></div>
    <div class="form-group"><label class="form-label">💰 约定薪资（元）</label><input class="form-input" id="pubPay" type="number" min="0" value="0"></div>
    <div class="form-group"><label class="form-label">🎯 积分</label><input class="form-input" id="pubPoints" type="number" min="0" value="50"></div>
    <div class="form-group"><label class="form-label">📝 描述</label><textarea class="form-input" id="pubContent" style="min-height:80px" placeholder="活动详情描述..."></textarea></div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="pubRequireCheckin" style="width:18px;height:18px">
        <span>需要现场签到</span>
      </label>
    </div>
    <div class="form-group">
      <label class="form-label">📌 报名截止日期</label>
      <input class="form-input" id="pubSignupDeadline" type="date">
    </div>
    <div class="btn btn-primary" onclick="doPublish()" style="margin:0 16px">📤 发布</div>
    <div id="pubError" style="text-align:center;color:var(--primary);font-size:14px;margin-top:8px"></div>`;
}

function checkinPage() {
  return `<div class="page-title">📍 签到</div>
    <div class="empty"><div class="icon">📍</div><p>请从"我的"页面点击签到按钮进行签到</p></div>
    <div style="padding:8px 16px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('my')">← 返回</span></div>`;
}

function leavePage() {
  return `<div class="page-title">📝 请假</div>
    <div class="empty"><div class="icon">📋</div><p>请假功能开发中...</p></div>
    <div style="padding:8px 16px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('my')">← 返回</span></div>`;
}

// ========== Tab Bar ==========
function tabBar() {
  const u = getCurrentUser();
  const isAdmin = u && u.role === 'admin';
  let tabs;
  if (isAdmin) {
    tabs = [
      { id: 'home', icon: '📋', label: '首页' },
      { id: 'my', icon: '👤', label: '我的' },
      { id: 'profile', icon: '⚙️', label: '设置' }
    ];
  } else {
    tabs = [
      { id: 'home', icon: '📋', label: '首页' },
      { id: 'my', icon: '👤', label: '我的' },
      { id: 'points', icon: '🏆', label: '积分' },
      { id: 'profile', icon: '⚙️', label: '设置' }
    ];
  }
  const cur = state.view;
  const activeViews = ['home', 'detail', 'checkin', 'leave', 'salary_apply', 'salary_slip', 'rewards'];
  return `<div class="tab-bar">${tabs.map(t =>
    `<div class="tab-item ${(cur === t.id || (activeViews.includes(cur) && t.id === 'home')) ? 'active' : ''}" onclick="navigate('${t.id}')">
      <span class="icon">${t.icon}</span>${t.label}
    </div>`
  ).join('')}</div>`;
}

// ========== Actions ==========
async function enroll(id) {
  const u = getCurrentUser();
  if (!u) return;

  const task = state.activities.find(a => a.id === id);
  if (!task) return;

  // Check if multi-date: if start_date/end_date exist, show date picker first
  if (task.start_date && task.end_date) {
    // Render date selection inline
    const app = document.getElementById('app');
    const dates = getDatesInRange(task.start_date, task.end_date);
    let dateHtml = `<div style="padding:16px">
      <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="render()">← 返回</span></div>
      <div class="page-title">📅 选择参与日期</div>
      <div class="card" style="margin:0">
        <div class="card-title">${task.title}</div>
        <div class="card-meta">📍 ${task.location || ''}</div>
      </div>
      <div style="padding:8px 16px;font-size:14px;color:var(--text-secondary)">可选日期：</div>`;
    dates.forEach(d => {
      dateHtml += `<div class="card" style="margin:8px 16px;cursor:pointer" onclick="enrollDate(${id},'${d}')">
        <div style="font-weight:600">📅 ${d}</div>
      </div>`;
    });
    dateHtml += `</div>`;
    if (u.role !== 'admin') dateHtml += tabBar();
    app.innerHTML = dateHtml;
    bindEvents();
    return;
  }

  // Single date enrollment (legacy)
  await enrollDirect(id, null, null);
}

function getDatesInRange(start, end) {
  const dates = [];
  const s = new Date(start);
  const e = new Date(end);
  while (s <= e) {
    const y = s.getFullYear();
    const m = String(s.getMonth() + 1).padStart(2, '0');
    const d = String(s.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    s.setDate(s.getDate() + 1);
  }
  return dates;
}

async function enrollDate(id, selectedDate) {
  const u = getCurrentUser();
  const task = state.activities.find(a => a.id === id);
  if (!task) return;

  // Parse time slots
  let slots = [];
  if (task.time_slots) {
    try {
      const parsed = JSON.parse(task.time_slots);
      if (Array.isArray(parsed)) slots = parsed;
    } catch (e) {}
  }

  if (slots.length === 0) {
    // No slots, enroll directly
    await enrollDirect(id, selectedDate, null);
    return;
  }

  // Show slot picker
  const app = document.getElementById('app');
  let slotHtml = `<div style="padding:16px">
    <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="enroll(${id})">← 返回</span></div>
    <div class="page-title">⏰ 选择时间段</div>
    <div class="card" style="margin:0">
      <div class="card-title">${task.title}</div>
      <div class="card-meta">📅 ${selectedDate}</div>
    </div>
    <div style="padding:8px 16px;font-size:14px;color:var(--text-secondary)">可选时段：</div>`;
  slots.forEach(slot => {
    slotHtml += `<div class="card" style="margin:8px 16px;cursor:pointer" onclick="enrollSlot(${id},'${selectedDate}','${slot}')">
      <div style="font-weight:600">⏰ ${slot}</div>
    </div>`;
  });
  slotHtml += `</div>`;
  if (u.role !== 'admin') slotHtml += tabBar();
  app.innerHTML = slotHtml;
  bindEvents();
}

async function enrollSlot(id, selectedDate, selectedSlot) {
  await enrollDirect(id, selectedDate, selectedSlot);
}

async function enrollDirect(id, selectedDate, selectedSlot) {
  const u = getCurrentUser();
  if (!u) return;

  // Check if already enrolled in this specific date+slot combo
  if (selectedDate) {
    const existing = state.apps.find(a =>
      String(a.taskid) === String(id) &&
      a.userid === String(u.id || u.name) &&
      a.selected_date === selectedDate &&
      a.selected_slot === selectedSlot
    );
    if (existing) { alert('该日期时段已报名'); return; }
  }

  // Check legacy enrollment (no date/slot)
  const enrolled = getMyEnrolled();
  if (!enrolled.includes(id)) {
    enrolled.push(id);
    saveMyEnrolled(enrolled);
  }

  // Update enrolled count in activity
  const acts = state.activities;
  const idx = acts.findIndex(a => a.id === id);
  if (idx > -1) {
    const newEnrolled = (acts[idx].enrolled || 0) + 1;
    await sbPut('activities', { id: 'eq.' + id }, { enrolled: newEnrolled });
  }

  const task = acts.find(a => a.id === id);

  await sbPost('apps', {
    taskid: id,
    userid: String(u.id || u.name),
    username: u.name,
    tasktitle: task?.title || '',
    taskpay: task?.points || task?.pay || 0,
    status: '待审核',
    appliedat: new Date().toISOString(),
    selected_date: selectedDate,
    selected_slot: selectedSlot
  });

  // Update local points
  state.user.points = (state.user.points || 0) + (task?.points || 50);
  saveUserToLocal(state.user);

  alert('报名成功！等待管理员审核');
  navigate('home');
}

async function doPublish() {
  const title = document.getElementById('pubTitle')?.value?.trim();
  const location = document.getElementById('pubLocation')?.value?.trim();
  const startDate = document.getElementById('pubStartDate')?.value;
  const endDate = document.getElementById('pubEndDate')?.value;
  const timeSlotsRaw = document.getElementById('pubTimeSlots')?.value?.trim();
  const people = parseInt(document.getElementById('pubPeople')?.value) || 10;
  const pay = parseFloat(document.getElementById('pubPay')?.value) || 0;
  const points = parseInt(document.getElementById('pubPoints')?.value) || 0;
  const content = document.getElementById('pubContent')?.value?.trim();
  const requireCheckin = document.getElementById('pubRequireCheckin')?.checked || false;
  const signupDeadline = document.getElementById('pubSignupDeadline')?.value;

  if (!title || !location) {
    document.getElementById('pubError').textContent = '请填写必填项：标题、地点';
    return;
  }

  // Parse time slots
  let timeSlots = null;
  if (timeSlotsRaw) {
    const parts = timeSlotsRaw.split(',').map(s => s.trim()).filter(s => s);
    if (parts.length > 0) timeSlots = JSON.stringify(parts);
  }

  const acts = state.activities;
  const maxId = acts.reduce((m, a) => Math.max(m, a.id || 0), 0);
  const u = getCurrentUser();

  const newActivity = {
    id: maxId + 1,
    title,
    location,
    content: content || '',
    points: points || 0,
    people,
    enrolled: 0,
    date: startDate || '',
    time: timeSlotsRaw || '全天',
    status: 'active',
    publisher: u.name,
    creator: true,
    start_date: startDate || null,
    end_date: endDate || null,
    time_slots: timeSlots,
    require_checkin: requireCheckin,
    signup_deadline: signupDeadline || null
  };

  await sbPost('activities', newActivity);
  alert('发布成功！');
  navigate('admin_tasks');
}

async function endActivity(id) {
  if (!confirm('确定结束该活动？')) return;
  await sbPut('activities', { id: 'eq.' + id }, { status: 'ended' });
  render();
}

async function delActivity(id) {
  if (!confirm('确定删除该活动？')) return;
  await sbDelete('activities', { id: 'eq.' + id });
  render();
}

async function approveApp(id) {
  await sbPut('apps', { id: 'eq.' + id }, { status: '已通过' });
  render();
}

async function rejectApp(id) {
  const reason = prompt('拒绝理由（选填）：') || '';
  await sbPut('apps', { id: 'eq.' + id }, { status: '已拒绝', rejectreason: reason });
  render();
}

async function completeActivity(id) {
  if (!confirm('确认标记为完成？')) return;
  const updates = { status: '已完成', completed_at: new Date().toISOString() };
  await sbPut('apps', { id: 'eq.' + id }, updates);

  // Update user completed count
  const appRec = state.apps.find(a => a.id === id);
  if (appRec) {
    const targetUser = state.users.find(u => (u.id || u.name) === appRec.userid);
    if (targetUser) {
      await sbPut('users', { id: 'eq.' + targetUser.id }, {
        completed_count: (targetUser.completed_count || 0) + 1
      });
    }
  }
  render();
}

// Show salary confirmation form inline
function showSalaryConfirmForm(appId) {
  const appRec = state.apps.find(a => a.id === appId);
  if (!appRec) return;
  const task = state.activities.find(t => String(t.id) === String(appRec.taskid));

  const app = document.getElementById('app');
  app.innerHTML = `<div style="padding:16px">
    <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="render()">← 返回</span></div>
    <div class="page-title">💰 薪资确认</div>
    <div class="card" style="margin:0">
      <div class="card-title">${appRec.username || ''} → ${appRec.tasktitle || ''}</div>
      <div class="card-meta">📅 ${appRec.selected_date || ''} ${appRec.selected_slot || ''}</div>
      <div class="card-meta">约定薪资: ¥${appRec.taskpay || 0}</div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">💰 确认薪资（元）*</label>
      <input class="form-input" id="confirmSalary" type="number" min="0" step="0.01" value="${appRec.taskpay || ''}" placeholder="输入确认金额">
    </div>
    <div class="form-group">
      <label class="form-label">🎯 积分</label>
      <input class="form-input" id="confirmPoints" type="number" min="0" value="${appRec.taskpay || task?.points || 0}" placeholder="积分奖励">
    </div>
    <div class="form-group">
      <label class="form-label">📋 凭证（截图/单号）</label>
      <input class="form-input" id="salaryScreenshot" placeholder="输入截图描述或单号">
    </div>
    <div class="btn btn-primary" onclick="confirmSalary(${appId})" style="margin:0">✅ 确认发放</div>
  </div>`;
  bindEvents();
}

async function confirmSalary(appId) {
  const confirmedSalary = parseFloat(document.getElementById('confirmSalary')?.value) || 0;
  const confirmedPoints = parseInt(document.getElementById('confirmPoints')?.value) || 0;
  const salaryScreenshot = document.getElementById('salaryScreenshot')?.value?.trim() || '';

  if (!confirmedSalary) {
    alert('请输入确认薪资金额');
    return;
  }

  const updates = {
    status: '已发放',
    salaryconfirmed: true,
    confirmed_salary: confirmedSalary,
    confirmed_points: confirmedPoints,
    confirmed_at: new Date().toISOString(),
    salary_screenshot: salaryScreenshot
  };

  await sbPut('apps', { id: 'eq.' + appId }, updates);

  // Update user stats
  const appRec = state.apps.find(a => a.id === appId);
  if (appRec) {
    const targetUser = state.users.find(u => (u.id || u.name) === appRec.userid);
    if (targetUser) {
      const newTotalSalary = (parseFloat(targetUser.total_salary) || 0) + confirmedSalary;
      const newTotalPoints = (parseInt(targetUser.total_points) || 0) + confirmedPoints;
      const newCompletedCount = (parseInt(targetUser.completed_count) || 0) + 1;
      await sbPut('users', { id: 'eq.' + targetUser.id }, {
        total_salary: newTotalSalary,
        total_points: newTotalPoints,
        completed_count: newCompletedCount
      });
    }
  }

  alert('薪资确认成功！');
  navigate('admin_apps');
}

async function doCheckin(appId) {
  if (!confirm('确认现场签到？')) return;
  const updates = {
    status: '已签到',
    checked_in_at: new Date().toISOString()
  };
  await sbPut('apps', { id: 'eq.' + appId }, updates);
  alert('签到成功！等待管理员确认完成。');
  navigate('my');
}

async function submitSalaryApply(appId) {
  const note = document.getElementById('salaryNote')?.value?.trim() || '';
  await sbPut('apps', { id: 'eq.' + appId }, {
    status: '待发放',
    salary_apply_note: note
  });
  alert('薪资申请已提交！');
  navigate('my');
}

async function redeemReward(rewardId) {
  const u = getCurrentUser();
  if (!u) return;

  const reward = state.rewards.find(r => r.id === rewardId);
  if (!reward) return;

  if (reward.stock <= 0) { alert('库存不足'); return; }

  const userRec = state.users.find(x => (x.id || x.name) === (u.id || u.name)) || {};
  const myPoints = userRec.total_points || u.points || 0;

  if (myPoints < reward.points_cost) { alert('积分不足'); return; }

  if (!confirm(`确认用 ${reward.points_cost} 积分兑换 "${reward.name}"？`)) return;

  // Deduct points
  const newPoints = myPoints - reward.points_cost;
  await sbPut('users', { id: 'eq.' + userRec.id }, { total_points: newPoints });

  // Decrement stock
  await sbPut('rewards', { id: 'eq.' + rewardId }, { stock: reward.stock - 1 });

  alert(`恭喜！成功兑换 "${reward.name}"`);
  render();
}

function showAddRewardForm() {
  const app = document.getElementById('app');
  app.innerHTML = `<div style="padding:16px">
    <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin_rewards')">← 返回</span></div>
    <div class="page-title">➕ 添加奖品</div>
    <div class="form-group"><label class="form-label">奖品名称 *</label><input class="form-input" id="rewardName" placeholder="如：星巴克咖啡券"></div>
    <div class="form-group"><label class="form-label">所需积分 *</label><input class="form-input" id="rewardCost" type="number" min="1" value="100"></div>
    <div class="form-group"><label class="form-label">库存数量 *</label><input class="form-input" id="rewardStock" type="number" min="0" value="10"></div>
    <div class="btn btn-primary" onclick="addReward()" style="margin:0">✅ 添加</div>
  </div>`;
  bindEvents();
}

async function addReward() {
  const name = document.getElementById('rewardName')?.value?.trim();
  const cost = parseInt(document.getElementById('rewardCost')?.value) || 0;
  const stock = parseInt(document.getElementById('rewardStock')?.value) || 0;
  if (!name || !cost) { alert('请填写必填项'); return; }

  await sbPost('rewards', {
    name,
    points_cost: cost,
    stock,
    status: 'active',
    created_at: new Date().toISOString()
  });

  alert('奖品添加成功！');
  navigate('admin_rewards');
}

async function toggleRewardStatus(rewardId, newStatus) {
  await sbPut('rewards', { id: 'eq.' + rewardId }, { status: newStatus });
  render();
}

function copySalarySlip(appId) {
  const appRec = state.apps.find(a => a.id === appId);
  if (!appRec) return;
  const text = `【薪资确认条】
活动：${appRec.tasktitle || ''}
日期：${appRec.selected_date || ''} ${appRec.selected_slot || ''}
金额：¥${appRec.confirmed_salary || 0}
积分：+${appRec.confirmed_points || 0}
确认时间：${appRec.confirmed_at ? appRec.confirmed_at.slice(0, 16).replace('T', ' ') : ''}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板'));
  } else {
    prompt('复制以下信息：', text);
  }
}

function setMyFilter(f) { state.filter = f; render(); }
function setAppFilter(f) { state.filter = f; render(); }

// ========== Bind Events ==========
function bindEvents() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const name = document.getElementById('loginName').value.trim();
      const isAdmin = document.getElementById('adminPwdGroup')?.style.display === 'block';
      const pwd = document.getElementById('loginPwd')?.value || '';
      const err = await login(name, isAdmin, pwd);
      if (err) document.getElementById('loginError').textContent = err;
    });
    document.getElementById('loginName')?.addEventListener('input', () => {
      const v = document.getElementById('loginName').value.trim();
      const adminPwdGroup = document.getElementById('adminPwdGroup');
      if (adminPwdGroup) {
        // Show admin pwd for both "管理员" keyword and the phone number
        adminPwdGroup.style.display = (v === '管理员' || v === '13800000000') ? 'block' : 'none';
      }
    });
    document.getElementById('adminToggle')?.addEventListener('click', () => {
      const g = document.getElementById('adminPwdGroup');
      if (g) {
        const isVisible = g.style.display === 'block';
        g.style.display = isVisible ? 'none' : 'block';
        document.getElementById('loginName').placeholder = isVisible ? '输入昵称' : '输入管理员手机号';
      }
    });
  }
}

// ========== Styles injection ==========
const styleEl = document.createElement('style');
styleEl.textContent = `
.filter-tabs { display: flex; gap: 6px; padding: 8px 16px; overflow-x: auto; }
.filter-tab { padding: 4px 14px; border-radius: 20px; font-size: 13px; background: #f0f0f0; cursor: pointer; white-space: nowrap; user-select: none; }
.filter-tab.active { background: var(--primary); color: white; }
.stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
.stat-card { background: white; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.stat-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.stat-icon { font-size: 28px; margin-bottom: 4px; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.overview-grid > * { background: #f8f9fc; padding: 12px; border-radius: 8px; text-align: center; font-size: 14px; }
.btn-small { padding: 4px 12px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; background: var(--primary); color: white; display: inline-block; margin: 2px; }
.btn-small.btn-danger { background: #ff5252; }
.btn-small[disabled] { background: #e0e0e0; cursor: default; }
`;
document.head.appendChild(styleEl);

// ========== Start ==========
init().then(() => render());
