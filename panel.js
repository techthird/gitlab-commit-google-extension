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
        // 检查成功后保存历史记录
        saveHistory(gitlabUrl, projects);
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

// 保存历史记录
async function saveHistory(gitlabUrl, projects) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    
    const historyItem = {
      time: timeStr,
      gitlabUrl: gitlabUrl,
      projects: projects.map(p => `${p.path}/${p.branch}`)
    };
    
    const result = await chrome.storage.local.get(['history']);
    const history = result.history || [];
    
    // 添加到历史记录开头
    history.unshift(historyItem);
    
    // 限制历史记录数量（最多保存50条）
    if (history.length > 50) {
      history.pop();
    }
    
    await chrome.storage.local.set({ history: history });
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

// 获取历史记录
async function getHistory() {
  try {
    const result = await chrome.storage.local.get(['history']);
    return result.history || [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

// 显示历史记录弹窗
async function showHistory() {
  const history = await getHistory();
  const historyList = document.getElementById('historyList');
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">暂无历史记录</div>';
  } else {
    // 创建表格
    let tableHTML = '<table class="history-table"><thead><tr><th>检查时间</th><th>项目路径/分支</th></tr></thead><tbody>';
    
    history.forEach((item, index) => {
      const projectsText = item.projects.join('<br>');
      tableHTML += `
        <tr class="history-row" data-index="${index}">
          <td class="history-time">${item.time}</td>
          <td class="history-projects">${projectsText}</td>
        </tr>
      `;
    });
    
    tableHTML += '</tbody></table>';
    historyList.innerHTML = tableHTML;
    
    // 为每一行添加点击事件
    document.querySelectorAll('.history-row').forEach(row => {
      row.addEventListener('click', () => {
        const index = parseInt(row.getAttribute('data-index'));
        fillFromHistory(history[index]);
        closeHistoryModal();
      });
    });
  }
  
  document.getElementById('historyModal').style.display = 'flex';
}

// 从历史记录填充表单
function fillFromHistory(historyItem) {
  document.getElementById('gitlabUrl').value = historyItem.gitlabUrl;
  document.getElementById('projectsInput').value = historyItem.projects.join('\n');
}

// 清空历史记录
async function clearHistory() {
  if (confirm('确定要清空所有历史记录吗？')) {
    try {
      await chrome.storage.local.remove('history');
      // 刷新历史记录列表
      await showHistory();
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('清空历史记录失败');
    }
  }
}

// 关闭历史记录弹窗
function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

// 关闭窗口
function closeWindow() {
  window.close();
}

// 从URL参数获取项目列表
function loadProjectsFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectPath = urlParams.get('projectPath');
    
    if (projectPath) {
      // 使用|分隔多个项目，并转换为换行符分隔
      const projects = projectPath.split('|').map(p => p.trim()).filter(p => p);
      if (projects.length > 0) {
        document.getElementById('projectsInput').value = projects.join('\n');
        // 填充完成后自动触发一键检查
        setTimeout(() => {
          checkCommits();
        }, 100); // 延迟100ms确保DOM更新完成
      }
    }
  } catch (error) {
    console.error('Error loading projects from URL:', error);
  }
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
  // 页面初始化时从URL参数加载项目列表
  loadProjectsFromUrl();
  
  document.getElementById('checkBtn').addEventListener('click', checkCommits);
  document.getElementById('closeBtn').addEventListener('click', closeWindow);
  document.getElementById('historyBtn').addEventListener('click', showHistory);
  document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  
  // 点击弹窗外部关闭
  document.getElementById('historyModal').addEventListener('click', (e) => {
    if (e.target.id === 'historyModal') {
      closeHistoryModal();
    }
  });
  
  // 支持Enter键提交（Ctrl+Enter）
  document.getElementById('projectsInput').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      checkCommits();
    }
  });
  
  // 支持ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const historyModal = document.getElementById('historyModal');
      if (historyModal.style.display === 'flex') {
        closeHistoryModal();
      } else {
        closeWindow();
      }
    }
  });
});
