// Amber的活动手札 - 网页版 v2 完整版
const DB = { KEY: 'nadb_activities', USER_KEY: 'nadb_user', USERS_KEY: 'nadb_users', APPS_KEY: 'nadb_apps', ADMIN_KEY: 'nadb_admin' };

// ========== State ==========
let state = { user: null, view: 'home', data: null, filter: 'all', apps: [], users: [], activities: [] };

function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; } }

// ========== Init ==========
function init() {
  // Admin account
  if (!localStorage.getItem(DB.ADMIN_KEY)) {
    save(DB.ADMIN_KEY, { name: '管理员', phone: '13800000000', password: 'admin123', inviteCode: 'naidezhuan2026' });
  }
  // Demo activities
  if (!localStorage.getItem(DB.KEY)) {
    save(DB.KEY, [
      { id: 1001, title: '周末朝阳公园散步', location: '朝阳公园', content: '周末一起逛公园散步，放松心情，适合带相机。', points: 50, people: 5, enrolled: 2, date: '2026-05-24', time: '09:00-11:00', status: 'active', publisher: 'Amber', creator: true },
      { id: 1002, title: '798咖啡品鉴小聚', location: '798艺术区', content: '一起逛798，找家咖啡馆坐下来聊最近的生活。', points: 80, people: 6, enrolled: 3, date: '2026-05-28', time: '14:00-17:00', status: 'active', publisher: 'Amber', creator: true },
      { id: 1003, title: '周末徒步+山顶品酒', location: '香山', content: '爬爬山，到山顶一起开一瓶马德拉，看风景聊天。', points: 100, people: 8, enrolled: 1, date: '2026-05-30', time: '08:00-12:00', status: 'active', publisher: 'Amber', creator: true }
    ]);
  }
  if (!localStorage.getItem(DB.USERS_KEY)) save(DB.USERS_KEY, []);
  if (!localStorage.getItem(DB.APPS_KEY)) save(DB.APPS_KEY, []);
}

// ========== Router ==========
function navigate(view, data) {
  state.view = view; state.data = data;
  // Persist enrolled for current user
  const u = getCurrentUser();
  if (u) { state.user = u; }
  render();
}

// ========== Auth ==========
function getCurrentUser() {
  if (state.user) return state.user;
  return load(DB.USER_KEY, null);
}

function login(name, isAdmin, pwd) {
  if (isAdmin) {
    const admin = load(DB.ADMIN_KEY);
    if (pwd !== admin.password) return '密码错误';
    const u = { name: admin.name, role: 'admin', phone: admin.phone };
    state.user = u; save(DB.USER_KEY, u); render(); return null;
  }
  if (!name.trim()) return '请输入昵称';
  let users = load(DB.USERS_KEY, []);
  let u = users.find(x => x.name === name);
  if (!u) { u = { id: Date.now(), name, points: 0, joined: new Date().toISOString(), completed: 0 }; users.push(u); save(DB.USERS_KEY, users); }
  u.role = 'user';
  state.user = u; save(DB.USER_KEY, u); render(); return null;
}

function logout() { localStorage.removeItem(DB.USER_KEY); state.user = null; navigate('home'); }

// ========== Data helpers ==========
function getActivities() { return load(DB.KEY, []); }
function saveActivities(a) { save(DB.KEY, a); }
function getUsers() { return load(DB.USERS_KEY, []); }
function getApps() { return load(DB.APPS_KEY, []); }
function getMyEnrolled() { const u = getCurrentUser(); return u ? load('enrolled_' + u.name, []) : []; }
function saveMyEnrolled(arr) { const u = getCurrentUser(); if (u) save('enrolled_' + u.name, arr); }

// ========== Render ==========
function render() {
  const app = document.getElementById('app');
  const user = getCurrentUser();
  let html = '';
  if (!user) { html = loginPage(); }
  else {
    switch (state.view) {
      case 'home': html = homePage(); break;
      case 'detail': html = detailPage(); break;
      case 'my': html = myPage(); break;
      case 'points': html = pointsPage(); break;
      case 'publish': html = adminPublish(); break;
      case 'admin': html = adminPage(); break;
      case 'admin_tasks': html = adminTasks(); break;
      case 'admin_apps': html = adminApps(); break;
      case 'admin_users': html = adminUsers(); break;
      case 'checkin': html = checkinPage(); break;
      case 'leave': html = leavePage(); break;
      case 'profile': html = profilePage(); break;
      default: html = homePage();
    }
  }
  if (user) html += tabBar();
  app.innerHTML = html;
  bindEvents();
}

// ========== Login ==========
function loginPage() {
  return `
  <div class="login-box">
    <div class="logo">📒</div>
    <h1>那得赚一笔</h1>
    <p>和朋友一起，记录每一次出发</p>
    <div class="form-group"><input class="form-input" id="loginName" placeholder="输入昵称或管理员手机号" maxlength="20"></div>
    <div class="form-group" id="adminPwdGroup" style="display:none"><input class="form-input" id="loginPwd" type="password" placeholder="输入管理员密码"></div>
    <div class="login-btn-group"><button class="btn btn-primary" id="loginBtn">进入</button></div>
    <div style="text-align:center;margin-top:12px"><span id="adminToggle" style="font-size:13px;color:var(--primary);cursor:pointer">管理员登录</span></div>
    <div id="loginError" class="login-error"></div>
  </div>`;
}

// ========== Home ==========
function homePage() {
  const acts = getActivities().filter(a => a.status === 'active');
  const enrolled = getMyEnrolled();
  let html = `<div class="header"><h1>📒 那得赚一笔</h1><p>看看朋友们最近在玩什么</p></div>`;
  if (!acts.length) {
    html += `<div class="empty"><div class="icon">📭</div><p>暂无进行中的活动</p></div>`;
  } else {
    acts.forEach(a => {
      const e = enrolled.includes(a.id);
      html += `<div class="card" onclick="navigate('detail',${a.id})">
        <div class="card-title">${a.title}</div>
        <div class="card-meta">📍 ${a.location}</div>
        <div class="card-meta">📅 ${a.date} ${a.time || ''}</div>
        <div class="card-footer"><span>👥 ${a.enrolled}/${a.people}人</span><span class="tag">进行中</span></div>
        ${e ? '<div class="btn btn-gray" style="margin:10px 0 0">✅ 已参与</div>'
          : '<div class="btn btn-primary" style="margin:10px 0 0" data-enroll="${a.id}" onclick="event.stopPropagation();enroll(${a.id})">🎯 我想去</div>'}
      </div>`;
    });
  }
  const u = getCurrentUser();
  if (u.role === 'admin') html += `<div style="text-align:center;padding:10px;color:var(--primary);cursor:pointer" onclick="navigate('admin')">🔐 管理后台</div>`;
  return html;
}

// ========== Detail ==========
function detailPage() {
  const a = getActivities().find(x => x.id === state.data);
  const enrolled = getMyEnrolled();
  if (!a) return homePage();
  const e = enrolled.includes(a.id);
  return `<div style="padding:16px"><div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('home')">← 返回</span></div>
    <div class="card" style="margin:0"><div class="card-title" style="font-size:20px">${a.title}</div>
    <div style="margin:8px 0"><span class="tag">进行中</span></div>
    <div class="card-meta">📍 ${a.location}</div>
    <div class="card-meta">📅 ${a.date} ${a.time || ''}</div>
    <div class="card-meta">👥 ${a.enrolled}/${a.people}人</div>
    <div class="card-meta">🎯 积分 +${a.points}</div>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)"><div style="font-weight:500;margin-bottom:6px">📝 内容</div><div class="card-meta">${a.content}</div></div>
    <div style="margin-top:12px"><div class="card-meta">👤 ${a.publisher}</div></div></div>
    ${e ? '<div class="btn btn-gray">✅ 已参与</div>' : '<div class="btn btn-primary" onclick="enroll('+a.id+')">🎯 我想参与</div>'}</div>`;
}

// ========== My Activities ==========
function myPage() {
  const u = getCurrentUser();
  const enrolled = getMyEnrolled();
  const acts = getActivities().filter(a => enrolled.includes(a.id));
  const apps = getApps().filter(a => a.userId === (u.id || u.name));
  let html = `<div class="page-title">📋 我的记录</div><div style="padding:8px 16px 0;font-size:14px;color:var(--text-secondary)">查看所有参与记录</div>`;
  // Filter tabs
  html += `<div class="filter-tabs">${['all','pending','approved','done'].map(f => 
    `<span class="filter-tab ${state.filter===f?'active':''}" onclick="setMyFilter('${f}')">${({all:'全部',pending:'待确认',approved:'已通过',done:'已完成'})[f]}</span>`
  ).join('')}</div>`;
  
  let filtered = acts;
  if (state.filter === 'pending') filtered = [];
  else if (state.filter === 'done') filtered = acts;
  
  if (!filtered.length) { html += `<div class="empty"><div class="icon">📭</div><p>暂无记录</p></div>`; }
  else {
    filtered.forEach(a => {
      const app = apps.find(x => x.taskId === a.id);
      const status = app ? app.status : '已完成';
      html += `<div class="card" onclick="navigate('detail',${a.id})">
        <div class="card-title">${a.title}</div>
        <div class="card-meta">📍 ${a.location} · 📅 ${a.date}</div>
        <div class="card-footer"><span class="card-meta">🎯 +${a.points}积分</span><span class="tag">${status}</span></div>
      </div>`;
    });
  }
  if (u.role === 'admin') html += `<div style="text-align:center;padding:10px;color:var(--primary);cursor:pointer" onclick="navigate('publish')">➕ 发布新活动</div>`;
  return html;
}

// ========== Points ==========
function pointsPage() {
  const u = getCurrentUser();
  return `<div class="points-header"><div class="points-label">我的积分</div><div class="points-num">${u.points || 0}</div><div class="points-label">参与活动获得的虚拟积分 🎯</div></div>
    <div class="page-title">📊 积分明细</div>
    <div class="empty"><div class="icon">🏆</div><p>继续参与活动赚积分吧~</p></div>`;
}

// ========== Profile ==========
function profilePage() {
  const u = getCurrentUser();
  const isAdmin = u.role === 'admin';
  return `<div class="page-title">⚙️ 设置</div>
    <div class="card" style="text-align:center"><div style="font-size:40px;margin-bottom:8px">👤</div>
    <div style="font-size:18px;font-weight:600">${u.name}</div>
    <div class="card-meta">${isAdmin ? '🔐 管理员' : '👤 用户'}</div>
    <div class="card-meta">积分：${u.points || 0}</div></div>
    ${isAdmin ? `<div class="card" style="cursor:pointer" onclick="navigate('admin')"><span>🔐 管理后台</span><span style="float:right">›</span></div>` : ''}
    <div class="card" style="cursor:pointer" onclick="logout()"><span style="color:var(--primary)">🚪 退出登录</span></div>`;
}

// ========== Admin Pages ==========
function adminPage() {
  const acts = getActivities();
  const users = getUsers();
  const apps = getApps();
  const pending = apps.filter(a => a.status === '待审核').length;
  return `<div class="page-title">🔐 管理后台</div>
    <div class="stats-row">
      <div class="stat-card" onclick="navigate('publish')"><div class="stat-icon">📝</div><div>发布活动</div></div>
      <div class="stat-card" onclick="navigate('admin_tasks')"><div class="stat-icon">📋</div><div>活动管理</div></div>
      <div class="stat-card" onclick="navigate('admin_apps')"><div class="stat-icon">👥</div><div>审核 (${pending})</div></div>
      <div class="stat-card" onclick="navigate('admin_users')"><div class="stat-icon">👤</div><div>用户</div></div>
    </div>
    <div class="card"><div style="font-weight:600;margin-bottom:12px">📊 数据概览</div>
    <div class="overview-grid"><div>📋 ${acts.length} 活动</div><div>👥 ${users.length} 用户</div><div>⏳ ${pending} 待审</div><div>✅ ${apps.filter(a=>a.status==='已完成').length} 完成</div></div></div>
    <div class="card" style="cursor:pointer" onclick="navigate('home')">← 返回首页</div>`;
}

function adminTasks() {
  const acts = getActivities();
  let html = `<div class="page-title">📋 活动管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>`;
  if (!acts.length) { html += `<div class="empty"><div class="icon">📭</div><p>暂无活动</p></div>`; }
  else {
    acts.forEach(a => {
      html += `<div class="card">
        <div class="card-title">${a.title}</div>
        <div class="card-meta">👥 ${a.enrolled}/${a.people} · ${a.date}</div>
        <div class="card-footer"><span class="tag ${a.status==='active'?'':'tag-gray'}">${a.status==='active'?'进行中':'已结束'}</span>
        <span><button class="btn-small" onclick="endActivity(${a.id})" ${a.status!=='active'?'disabled':''}>⏹ 结束</button>
        <button class="btn-small btn-danger" onclick="delActivity(${a.id})">🗑 删除</button></span></div>
      </div>`;
    });
  }
  return html;
}

function adminApps() {
  const apps = getApps();
  const acts = getActivities();
  const users = getUsers();
  let html = `<div class="page-title">👥 参与审核 (${apps.filter(a=>a.status==='待审核').length})</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>
    <div class="filter-tabs" style="padding:8px 16px">
      ${['all','pending','salary'].map(f => 
        `<span class="filter-tab ${state.filter===f?'active':''}" onclick="setAppFilter('${f}')">${({all:'全部',pending:'待审核',salary:'待结算'})[f]}</span>`
      ).join('')}
    </div>`;
  
  let filtered = apps;
  if (state.filter === 'pending') filtered = apps.filter(a => a.status === '待审核');
  else if (state.filter === 'salary') filtered = apps.filter(a => a.status === '已完成' && !a.salaryConfirmed);
  
  if (!filtered.length) { html += `<div class="empty"><div class="icon">📭</div><p>暂无记录</p></div>`; }
  else {
    filtered.forEach(a => {
      const task = acts.find(t => t.id === a.taskId);
      html += `<div class="card">
        <div class="card-title">${a.userName} → ${a.taskTitle}</div>
        <div class="card-meta">状态：${a.status} · 📅 ${(a.appliedAt||'').slice(0,10)}</div>
        <div class="card-footer">
          ${a.status === '待审核' ? 
            `<span><button class="btn-small" onclick="approveApp(${a.id})">✅ 通过</button>
            <button class="btn-small btn-danger" onclick="rejectApp(${a.id})">❌ 拒绝</button></span>` :
            a.status === '已完成' && !a.salaryConfirmed ?
            `<button class="btn-small" onclick="completeSalary(${a.id})">💰 结算积分</button>` :
            `<span class="tag">${a.status}</span>`}
        </div>
      </div>`;
    });
  }
  return html;
}

function adminUsers() {
  const users = getUsers();
  const apps = getApps();
  let html = `<div class="page-title">👤 用户管理</div>
    <div style="padding:8px 16px 0"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>`;
  if (!users.length) { html += `<div class="empty"><div class="icon">👤</div><p>暂无用户</p></div>`; }
  else {
    users.forEach(u => {
      const cnt = apps.filter(a => a.userId === u.name && a.status === '已完成').length;
      html += `<div class="card"><div class="card-title">${u.name}</div>
        <div class="card-meta">积分 ${u.points||0} · 完成 ${u.completed||cnt} 次 · 加入 ${(u.joined||'').slice(0,10)}</div></div>`;
    });
  }
  return html;
}

function adminPublish() {
  return `<div class="page-title">📝 发布新活动</div>
    <div style="padding:0 16px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('admin')">← 返回</span></div>
    <div class="form-group"><label class="form-label">活动标题</label><input class="form-input" id="pubTitle" maxlength="50"></div>
    <div class="form-group"><label class="form-label">📍 地点</label><input class="form-input" id="pubLocation"></div>
    <div class="form-group"><label class="form-label">📅 日期</label><input class="form-input" id="pubDate" type="date"></div>
    <div class="form-group"><label class="form-label">⏰ 时间</label><input class="form-input" id="pubTime" placeholder="如：14:00-17:00"></div>
    <div class="form-group"><label class="form-label">👥 人数</label><input class="form-input" id="pubPeople" type="number" min="1" value="10"></div>
    <div class="form-group"><label class="form-label">🎯 积分</label><input class="form-input" id="pubPoints" type="number" min="0" value="50"></div>
    <div class="form-group"><label class="form-label">📝 描述</label><textarea class="form-input" id="pubContent" style="min-height:80px"></textarea></div>
    <div class="btn btn-primary" onclick="doPublish()" style="margin:0 16px">📤 发布</div>
    <div id="pubError" style="text-align:center;color:var(--primary);font-size:14px;margin-top:8px"></div>`;
}

function checkinPage() { return `<div class="page-title">✅ 签到</div><div class="empty"><div class="icon">📍</div><p>签到功能开发中...</p></div>`; }
function leavePage() { return `<div class="page-title">📝 请假</div><div class="empty"><div class="icon">📋</div><p>请假功能开发中...</p></div>`; }

// ========== Tab Bar ==========
function tabBar() {
  const u = getCurrentUser();
  const tabs = [
    { id: 'home', icon: '📋', label: '活动' },
    { id: 'my', icon: '👤', label: '我的' },
    { id: 'points', icon: '🏆', label: '积分' },
    { id: 'profile', icon: '⚙️', label: '设置' }
  ];
  const cur = state.view;
  return `<div class="tab-bar">${tabs.map(t => 
    `<div class="tab-item ${cur===t.id||(t.id==='home'&&['detail','checkin','leave'].includes(cur))?'active':''}" onclick="navigate('${t.id}')">
      <span class="icon">${t.icon}</span>${t.label}</div>`
  ).join('')}</div>`;
}

// ========== Actions ==========
function enroll(id) {
  const u = getCurrentUser(); if (!u) return;
  let enrolled = getMyEnrolled();
  if (enrolled.includes(id)) return;
  enrolled.push(id); saveMyEnrolled(enrolled);
  const acts = getActivities(); const idx = acts.findIndex(a => a.id === id);
  if (idx > -1) { acts[idx].enrolled = (acts[idx].enrolled||0) + 1; saveActivities(acts); }
  const apps = getApps();
  apps.push({ id: Date.now(), taskId: id, userId: u.id || u.name, userName: u.name, taskTitle: acts[idx]?.title, taskPay: acts[idx]?.points||0, status: '待审核', appliedAt: new Date().toISOString() });
  save(DB.APPS_KEY, apps);
  state.user.points = (state.user.points||0) + (acts[idx]?.points||50);
  save(DB.USER_KEY, state.user);
  render();
}

function doPublish() {
  const title = document.getElementById('pubTitle')?.value?.trim();
  const location = document.getElementById('pubLocation')?.value?.trim();
  const date = document.getElementById('pubDate')?.value;
  const time = document.getElementById('pubTime')?.value?.trim();
  const people = parseInt(document.getElementById('pubPeople')?.value) || 10;
  const points = parseInt(document.getElementById('pubPoints')?.value) || 50;
  const content = document.getElementById('pubContent')?.value?.trim();
  if (!title || !location || !date || !content) { document.getElementById('pubError').textContent = '请填写必填项'; return; }
  const acts = getActivities();
  const maxId = acts.reduce((m, a) => Math.max(m, a.id), 0);
  const u = getCurrentUser();
  acts.push({ id: maxId+1, title, location, content, points, people, enrolled: 0, date, time: time||'全天', status: 'active', publisher: u.name, creator: true });
  saveActivities(acts);
  navigate('admin_tasks');
}

function endActivity(id) {
  if (!confirm('确定结束该活动？')) return;
  const acts = getActivities(); const a = acts.find(x => x.id === id);
  if (a) { a.status = 'ended'; saveActivities(acts); render(); }
}

function delActivity(id) {
  if (!confirm('确定删除该活动？')) return;
  saveActivities(getActivities().filter(x => x.id !== id));
  render();
}

function approveApp(id) {
  const apps = getApps(); const a = apps.find(x => x.id === id);
  if (a) { a.status = '已通过'; save(DB.APPS_KEY, apps); render(); }
}

function rejectApp(id) {
  const reason = prompt('拒绝理由：') || '未通过审核';
  const apps = getApps(); const a = apps.find(x => x.id === id);
  if (a) { a.status = '已拒绝'; a.rejectReason = reason; save(DB.APPS_KEY, apps); render(); }
}

function completeSalary(id) {
  if (!confirm('确认结算积分？')) return;
  const apps = getApps(); const a = apps.find(x => x.id === id);
  if (!a) return;
  a.status = '已完成'; a.salaryConfirmed = true;
  save(DB.APPS_KEY, apps);
  // Update user points
  const users = getUsers(); const u = users.find(x => x.name === a.userName);
  if (u) { u.points = (u.points||0) + (a.taskPay||0); u.completed = (u.completed||0) + 1; save(DB.USERS_KEY, users); }
  const cu = getCurrentUser(); if (cu.name === a.userName) { cu.points = (cu.points||0) + (a.taskPay||0); save(DB.USER_KEY, cu); }
  render();
}

function setMyFilter(f) { state.filter = f; render(); }
function setAppFilter(f) { state.filter = f; render(); }

// ========== Bind Events ==========
function bindEvents() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const name = document.getElementById('loginName').value.trim();
      const isAdmin = document.getElementById('adminPwdGroup').style.display === 'block';
      const pwd = document.getElementById('loginPwd')?.value || '';
      const err = login(name, isAdmin, pwd);
      if (err) document.getElementById('loginError').textContent = err;
    });
    document.getElementById('loginName')?.addEventListener('input', () => {
      const v = document.getElementById('loginName').value.trim();
      const admin = load(DB.ADMIN_KEY);
      document.getElementById('adminPwdGroup').style.display = (v === admin.phone) ? 'block' : 'none';
    });
    document.getElementById('adminToggle')?.addEventListener('click', () => {
      const g = document.getElementById('adminPwdGroup');
      g.style.display = g.style.display === 'block' ? 'none' : 'block';
      document.getElementById('loginName').placeholder = g.style.display === 'block' ? '输入管理员手机号' : '输入昵称';
    });
  }
}

// ========== Styles injection ==========
const style = document.createElement('style');
style.textContent = `
.filter-tabs { display: flex; gap: 6px; padding: 8px 16px; overflow-x: auto; }
.filter-tab { padding: 4px 14px; border-radius: 20px; font-size: 13px; background: #f0f0f0; cursor: pointer; white-space: nowrap; }
.filter-tab.active { background: var(--primary); color: white; }
.stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
.stat-card { background: white; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.stat-icon { font-size: 28px; margin-bottom: 4px; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.overview-grid > * { background: #f8f9fc; padding: 12px; border-radius: 8px; text-align: center; font-size: 14px; }
.btn-small { padding: 4px 12px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; background: var(--primary); color: white; }
.btn-small.btn-danger { background: #ff5252; }
.btn-small[disabled] { background: #e0e0e0; cursor: default; }
`;
document.head.appendChild(style);

// ========== Start ==========
init();
render();