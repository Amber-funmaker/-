// Amber的活动手札 - 网页版
const DB_KEY = 'naide_activities';
const USER_KEY = 'naide_user';

// Data
let state = {
  user: null,
  activities: [],
  myRecords: [],
  currentView: 'home',
  selectedActivity: null,
  filter: 'all'
};

// Init demo data
function initData() {
  if (!localStorage.getItem(DB_KEY)) {
    const demo = [
      { id: 1, title: '周末朝阳公园散步', location: '朝阳公园', content: '周末一起逛公园散步，放松心情，适合带相机。', points: 50, people: 5, enrolled: 2, date: '2026-05-24', time: '09:00-11:00', status: 'active', publisher: 'Amber', creator: true },
      { id: 2, title: '798咖啡品鉴小聚', location: '798艺术区', content: '一起逛798，找家咖啡馆坐下来聊聊最近的生活和读书心得。', points: 80, people: 6, enrolled: 3, date: '2026-05-28', time: '14:00-17:00', status: 'active', publisher: 'Amber', creator: true }
    ];
    localStorage.setItem(DB_KEY, JSON.stringify(demo));
  }
}

// Navigation
function navigate(view, data) {
  state.currentView = view;
  state.selectedActivity = data || null;
  render();
}

// Render
function render() {
  const app = document.getElementById('app');
  const user = getCurrentUser();
  
  if (!user) {
    app.innerHTML = renderLogin();
    return;
  }
  state.user = user;
  
  let content = '';
  switch (state.currentView) {
    case 'home': content = renderHome(); break;
    case 'detail': content = renderDetail(); break;
    case 'my': content = renderMyActivities(); break;
    case 'points': content = renderPoints(); break;
    case 'publish': content = renderPublish(); break;
    default: content = renderHome();
  }
  
  app.innerHTML = content + renderTabBar();
  bindEvents();
}

// Login
function renderLogin() {
  return `
    <div class="login-box">
      <div class="logo">📒</div>
      <h1>那得赚一笔</h1>
      <p>和朋友一起，记录每一次出发</p>
      <div class="form-group">
        <input class="form-input" id="loginName" placeholder="输入你的昵称" maxlength="20">
      </div>
      <div class="login-btn-group">
        <button class="btn btn-primary" id="loginBtn">进入</button>
      </div>
      <div id="loginError" class="login-error"></div>
    </div>
  `;
}

function getCurrentUser() {
  if (state.user) return state.user;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Home
function renderHome() {
  const activities = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const user = getCurrentUser();
  const enrolledIds = JSON.parse(localStorage.getItem('enrolled_' + user.name) || '[]');
  
  let html = `
    <div class="header">
      <h1>📒 那得赚一笔</h1>
      <p>看看朋友们最近在玩什么</p>
    </div>
  `;
  
  const activeActivities = activities.filter(a => a.status === 'active');
  
  if (activeActivities.length === 0) {
    html += `<div class="empty"><div class="icon">📭</div><p>暂无进行中的活动</p></div>`;
  } else {
    html += `<div id="activityList">`;
    activeActivities.forEach(a => {
      const isEnrolled = enrolledIds.includes(a.id);
      html += `
        <div class="card" data-id="${a.id}" onclick="navigate('detail', ${a.id})">
          <div class="card-title">${a.title}</div>
          <div class="card-meta">📍 ${a.location}</div>
          <div class="card-meta">📅 ${a.date} ${a.time}</div>
          <div class="card-footer">
            <span class="card-meta">👥 ${a.enrolled}/${a.people}人</span>
            <span class="tag">进行中</span>
          </div>
          ${!isEnrolled ? `<button class="btn btn-primary" style="margin:10px 0 0" onclick="event.stopPropagation();enroll(${a.id})">🎯 我想去</button>`
            : `<button class="btn btn-gray" style="margin:10px 0 0">✅ 已参与</button>`}
        </div>
      `;
    });
    html += `</div>`;
  }
  
  return html;
}

// Detail
function renderDetail() {
  const activities = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const a = activities.find(x => x.id === state.selectedActivity);
  const user = getCurrentUser();
  const enrolledIds = JSON.parse(localStorage.getItem('enrolled_' + user.name) || '[]');
  const isEnrolled = enrolledIds.includes(a?.id);
  
  if (!a) return renderHome();
  
  return `
    <div style="padding:16px">
      <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('home')">← 返回</span></div>
      <div class="card" style="margin:0">
        <div class="card-title" style="font-size:20px">${a.title}</div>
        <div style="margin:8px 0"><span class="tag">进行中</span></div>
        <div class="card-meta">📍 ${a.location}</div>
        <div class="card-meta">📅 ${a.date} ${a.time}</div>
        <div class="card-meta">👥 ${a.enrolled}/${a.people}人已参与</div>
        <div class="card-meta">🎯 积分 +${a.points}</div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div style="font-weight:500;margin-bottom:6px">📝 活动内容</div>
          <div class="card-meta">${a.content}</div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div class="card-meta">👤 发布者：${a.publisher}</div>
        </div>
      </div>
      ${!isEnrolled ? `<button class="btn btn-primary" onclick="enroll(${a.id})">🎯 我想参与</button>`
        : `<button class="btn btn-gray">✅ 已参与</button>`}
    </div>
  `;
}

// My Activities
function renderMyActivities() {
  const user = getCurrentUser();
  const enrolledIds = JSON.parse(localStorage.getItem('enrolled_' + user.name) || '[]');
  const activities = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const myActs = activities.filter(a => enrolledIds.includes(a.id));
  
  let html = `
    <div class="page-title">📋 我的记录</div>
    <div style="padding:8px 16px 0;font-size:14px;color:var(--text-secondary)">查看所有参与记录</div>
  `;
  
  if (myActs.length === 0) {
    html += `<div class="empty"><div class="icon">📭</div><p>还没有参与活动哦~</p></div>`;
  } else {
    myActs.forEach(a => {
      html += `
        <div class="card" onclick="navigate('detail', ${a.id})">
          <div class="card-title">${a.title}</div>
          <div class="card-meta">📍 ${a.location} · 📅 ${a.date}</div>
          <div class="card-footer">
            <span class="card-meta">🎯 积分 +${a.points}</span>
            <span class="tag">已完成</span>
          </div>
        </div>
      `;
    });
  }
  
  return html + `<div style="text-align:center;padding:20px"><span style="color:var(--primary);cursor:pointer" onclick="navigate('publish')">➕ 发布新活动</span></div>`;
}

// Points
function renderPoints() {
  const user = getCurrentUser();
  const points = user.points || 0;
  
  return `
    <div class="points-header">
      <div class="points-label">我的积分</div>
      <div class="points-num">${points}</div>
      <div class="points-label">参与活动获得的虚拟积分 🎯</div>
    </div>
    <div class="page-title">📊 积分明细</div>
    <div class="empty"><div class="icon">🏆</div><p>继续参与活动赚积分吧~</p></div>
  `;
}

// Publish
function renderPublish() {
  return `
    <div style="padding:16px">
      <div style="margin-bottom:12px"><span style="cursor:pointer;color:var(--primary)" onclick="navigate('home')">← 返回</span></div>
      <div style="font-size:20px;font-weight:600;margin-bottom:16px">📝 发布新活动</div>
      
      <div class="form-group">
        <label class="form-label">活动标题</label>
        <input class="form-input" id="pubTitle" placeholder="给活动取个名字" maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">📍 地点</label>
        <input class="form-input" id="pubLocation" placeholder="活动地点">
      </div>
      <div class="form-group">
        <label class="form-label">📅 日期</label>
        <input class="form-input" id="pubDate" type="date">
      </div>
      <div class="form-group">
        <label class="form-label">⏰ 时间</label>
        <input class="form-input" id="pubTime" placeholder="如：14:00-17:00">
      </div>
      <div class="form-group">
        <label class="form-label">👥 人数上限</label>
        <input class="form-input" id="pubPeople" type="number" min="1" value="10">
      </div>
      <div class="form-group">
        <label class="form-label">🎯 积分奖励</label>
        <input class="form-input" id="pubPoints" type="number" min="0" value="50">
      </div>
      <div class="form-group">
        <label class="form-label">📝 活动描述</label>
        <textarea class="form-input" id="pubContent" placeholder="描述一下活动内容..."></textarea>
      </div>
      
      <button class="btn btn-primary" onclick="publishActivity()">📤 发布</button>
      <div id="pubError" style="text-align:center;color:var(--primary);font-size:14px;margin-top:8px"></div>
    </div>
  `;
}

// Tab Bar
function renderTabBar() {
  const tabs = [
    { id: 'home', icon: '📋', label: '活动' },
    { id: 'my', icon: '👤', label: '我的' },
    { id: 'points', icon: '🏆', label: '积分' }
  ];
  
  return `
    <div class="tab-bar">
      ${tabs.map(t => `
        <div class="tab-item ${state.currentView === t.id || (t.id === 'home' && state.currentView === 'detail') ? 'active' : ''}" onclick="navigate('${t.id}')">
          <span class="icon">${t.icon}</span>
          ${t.label}
        </div>
      `).join('')}
    </div>
  `;
}

// Events
function bindEvents() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const name = document.getElementById('loginName').value.trim();
      if (!name) {
        document.getElementById('loginError').textContent = '请输入昵称';
        return;
      }
      const user = { name, points: 0, pointsLog: [] };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      state.user = user;
      render();
    });
    document.getElementById('loginName')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginBtn.click();
    });
  }
}

// Actions
function enroll(id) {
  const user = getCurrentUser();
  if (!user) return;
  
  let enrolled = JSON.parse(localStorage.getItem('enrolled_' + user.name) || '[]');
  if (enrolled.includes(id)) return;
  
  enrolled.push(id);
  localStorage.setItem('enrolled_' + user.name, JSON.stringify(enrolled));
  
  // Update count
  const activities = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const idx = activities.findIndex(a => a.id === id);
  if (idx > -1) {
    activities[idx].enrolled = (activities[idx].enrolled || 0) + 1;
    localStorage.setItem(DB_KEY, JSON.stringify(activities));
  }
  
  // Add points
  user.points = (user.points || 0) + (activities[idx]?.points || 50);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  state.user = user;
  
  render();
}

function publishActivity() {
  const title = document.getElementById('pubTitle')?.value?.trim();
  const location = document.getElementById('pubLocation')?.value?.trim();
  const date = document.getElementById('pubDate')?.value;
  const time = document.getElementById('pubTime')?.value?.trim();
  const people = parseInt(document.getElementById('pubPeople')?.value) || 10;
  const points = parseInt(document.getElementById('pubPoints')?.value) || 50;
  const content = document.getElementById('pubContent')?.value?.trim();
  
  if (!title || !location || !date || !content) {
    document.getElementById('pubError').textContent = '请填写必要信息（标题、地点、日期、描述）';
    return;
  }
  
  const user = getCurrentUser();
  const activities = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const maxId = activities.reduce((max, a) => Math.max(max, a.id), 0);
  
  activities.push({
    id: maxId + 1,
    title, location, content, points, people, enrolled: 0, date, time: time || '全天',
    status: 'active', publisher: user.name, creator: true
  });
  
  localStorage.setItem(DB_KEY, JSON.stringify(activities));
  navigate('home');
}

// Init
initData();
render();