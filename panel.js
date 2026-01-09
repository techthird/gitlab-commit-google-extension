// 解析项目输入，格式: 项目路径/分支
function parseProjects(input) {
  const lines = input.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const projects = [];
  for (const line of lines) {
    const parts = line.split('/');
    if (parts.length >= 2) {
      const branch = parts[parts.length - 1];
      const projectPath = parts.slice(0, -1).join('/');
      projects.push({
        path: projectPath,
        branch: branch
      });
    } else {
      // 如果没有指定分支，默认使用main
      projects.push({
        path: line,
        branch: 'main'
      });
    }
  }
  return projects;
}

// 显示加载状态
function showLoading() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('results').style.display = 'none';
  document.getElementById('error').style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// 显示错误信息
function showError(message) {
  document.getElementById('error').textContent = message;
  document.getElementById('error').style.display = 'block';
  document.getElementById('results').style.display = 'none';
}

// 格式化时间 - 优化版本：显示相对时间和具体时间，并根据是否当天设置颜色
function formatTime(timeString) {
  if (!timeString) return { html: '未知', isToday: false };
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return { html: '未知', isToday: false };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const commitDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isToday = commitDate.getTime() === today.getTime();
    
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    // 格式化具体时间：2026-01-10 10:00:00
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    
    let relativeTime = '';
    if (minutes < 1) {
      relativeTime = '刚刚';
    } else if (minutes < 60) {
      relativeTime = `${minutes}分钟前`;
    } else if (hours < 24) {
      relativeTime = `${hours}小时前`;
    } else if (days < 7) {
      relativeTime = `${days}天前`;
    } else {
      relativeTime = `${days}天前`;
    }
    
    const timeHtml = `${relativeTime}（${formattedDate}）`;
    
    return {
      html: timeHtml,
      isToday: isToday
    };
  } catch (e) {
    return { html: '未知', isToday: false };
  }
}

// 渲染结果
function renderResults(results) {
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';
  
  if (results.length === 0) {
    resultsList.innerHTML = '<div class="empty-state"><p>没有结果</p></div>';
    return;
  }
  
  results.forEach(result => {
    const item = document.createElement('div');
    item.className = `result-item ${result.success ? 'success' : 'error'}`;
    
    if (result.success) {
      const commit = result.data;
      const timeInfo = formatTime(commit.committed_date || commit.created_at);
      const timeClass = timeInfo.isToday ? 'time-today' : 'time-not-today';
      
      item.innerHTML = `
        <div class="result-header">
          <div class="result-project">${escapeHtml(result.project)}</div>
          <div class="result-branch">${escapeHtml(result.branch)}</div>
        </div>
        <div class="result-info">
          <div class="result-field">
            <label>提交人</label>
            <div class="value">${escapeHtml(commit.author_name || '未知')}</div>
          </div>
          <div class="result-field">
            <label>提交时间</label>
            <div class="value ${timeClass}">${timeInfo.html}</div>
          </div>
        </div>
        <div class="result-message">
          <label>提交备注</label>
          <div class="value">
            ${commit.short_id ? `<div class="commit-id">提交ID：${escapeHtml(commit.short_id)}</div>` : ''}
            <div class="commit-message">${escapeHtml(commit.message || '无备注')}</div>
          </div>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="result-header">
          <div class="result-project">${escapeHtml(result.project)}</div>
          <div class="result-branch">${escapeHtml(result.branch)}</div>
        </div>
        <div class="result-field">
          <label>错误信息</label>
          <div class="value">${escapeHtml(result.error || '获取失败')}</div>
        </div>
      `;
    }
    
    resultsList.appendChild(item);
  });
  
  document.getElementById('results').style.display = 'block';
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 主函数：检查提交记录
async function checkCommits() {
  const gitlabUrl = document.getElementById('gitlabUrl').value.trim();
  const projectsInput = document.getElementById('projectsInput').value.trim();
  
  if (!gitlabUrl) {
    showError('请输入GitLab地址');
    return;
  }
  
  if (!projectsInput) {
    showError('请输入项目列表');
    return;
  }
  
  const projects = parseProjects(projectsInput);
  if (projects.length === 0) {
    showError('请至少输入一个项目');
    return;
  }
  
  showLoading();
  document.getElementById('checkBtn').disabled = true;
  
  try {
    // 查找GitLab相关的标签页
    const tabs = await chrome.tabs.query({});
    const gitlabTab = tabs.find(tab => {
      try {
        const url = new URL(tab.url);
        const gitlabHost = new URL(gitlabUrl).hostname;
        return url.hostname === gitlabHost || url.hostname.includes(gitlabHost.split('.')[0]);
      } catch (e) {
        return false;
      }
    });
    
    // 如果找不到GitLab标签页，尝试使用当前标签页
    const targetTabId = gitlabTab ? gitlabTab.id : null;
    
    // 发送消息到background script
    chrome.runtime.sendMessage({
      action: 'checkCommits',
      gitlabUrl: gitlabUrl,
      projects: projects,
      tabId: targetTabId
    }, (response) => {
      hideLoading();
      document.getElementById('checkBtn').disabled = false;
      
      if (chrome.runtime.lastError) {
        showError('通信错误: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response) {
        showError('未收到响应，请重试');
        return;
      }
      
      if (response.error) {
        showError(response.error);
      } else if (response.results) {
        renderResults(response.results);
      } else {
        showError('响应格式错误');
      }
    });
  } catch (error) {
    console.error('Error:', error);
    showError('检查失败: ' + error.message);
    hideLoading();
    document.getElementById('checkBtn').disabled = false;
  }
}

// 关闭窗口
function closeWindow() {
  window.close();
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('checkBtn').addEventListener('click', checkCommits);
  document.getElementById('closeBtn').addEventListener('click', closeWindow);
  
  // 支持Enter键提交（Ctrl+Enter）
  document.getElementById('projectsInput').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      checkCommits();
    }
  });
  
  // 支持ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWindow();
    }
  });
});
