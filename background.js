// 获取指定URL的cookie
async function getCookies(url) {
  try {
    // 获取该域名及其所有子域名的cookie
    const domain = new URL(url).hostname;
    const cookies = await chrome.cookies.getAll({ domain: domain });
    
    // 优先获取认证相关的cookie
    const authCookies = cookies.filter(c => 
      c.name.includes('_gitlab_session') || 
      c.name.includes('_session') ||
      c.name.includes('remember_user_token') ||
      c.name.includes('csrf_token')
    );
    
    // 合并所有cookie
    const allCookies = authCookies.length > 0 ? authCookies : cookies;
    const cookieString = allCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    return cookieString;
  } catch (error) {
    console.error('Error getting cookies:', error);
    return '';
  }
}

// 从content script获取headers
async function getHeaders(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'getHeaders' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting headers:', chrome.runtime.lastError);
        resolve({});
      } else {
        resolve(response || {});
      }
    });
  });
}

// 编码项目路径（GitLab API需要URL编码）
function encodeProjectPath(path) {
  return encodeURIComponent(path);
}

// 获取GitLab项目的最新提交
async function getLatestCommit(gitlabUrl, projectPath, branch, cookies, headers) {
  const baseUrl = gitlabUrl.replace(/\/$/, '');
  const encodedPath = encodeProjectPath(projectPath);
  const apiUrl = `${baseUrl}/api/v4/projects/${encodedPath}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=1`;
  
  try {
    const requestHeaders = {
      'Accept': 'application/json',
      ...headers
    };
    
    if (cookies) {
      requestHeaders['Cookie'] = cookies;
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: requestHeaders,
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch (e) {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText.substring(0, 100); // 限制错误信息长度
        }
      }
      
      // 友好的错误提示
      if (response.status === 401) {
        errorMessage = '未授权，请确保已登录GitLab';
      } else if (response.status === 404) {
        errorMessage = '项目不存在或无权限访问';
      } else if (response.status === 403) {
        errorMessage = '无权限访问该项目';
      }
      
      throw new Error(errorMessage);
    }
    
    const commits = await response.json();
    
    if (Array.isArray(commits) && commits.length > 0) {
      return commits[0];
    } else {
      throw new Error('未找到提交记录');
    }
  } catch (error) {
    console.error(`Error fetching commit for ${projectPath}:`, error);
    throw error;
  }
}

// 处理检查提交记录的消息
async function handleCheckCommits(message, sendResponse) {
  const { gitlabUrl, projects, tabId } = message;
  
  try {
    // 获取cookie和headers
    const cookies = await getCookies(gitlabUrl);
    let headers = {};
    if (tabId) {
      headers = await getHeaders(tabId);
    }
    
    // 并发检查所有项目
    const promises = projects.map(async (project) => {
      try {
        const commit = await getLatestCommit(
          gitlabUrl,
          project.path,
          project.branch,
          cookies,
          headers
        );
        
        return {
          success: true,
          project: project.path,
          branch: project.branch,
          data: commit
        };
      } catch (error) {
        return {
          success: false,
          project: project.path,
          branch: project.branch,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(promises);
    
    sendResponse({ success: true, results: results });
  } catch (error) {
    console.error('Error in handleCheckCommits:', error);
    sendResponse({ 
      success: false, 
      error: error.message || '检查失败' 
    });
  }
}

// 监听来自popup和content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkCommits') {
    handleCheckCommits(message, sendResponse);
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitLab提交记录检查器已安装');
});

// 点击扩展图标时直接打开新标签页
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('panel.html')
  });
});
