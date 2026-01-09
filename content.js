// 获取当前页面的headers信息
function getPageHeaders() {
  const headers = {};
  
  // 尝试从XMLHttpRequest获取headers（如果页面有发送请求）
  // 注意：content script无法直接访问所有请求headers，但可以获取一些信息
  
  // 获取常见的认证headers（如果页面有设置）
  const metaTags = document.querySelectorAll('meta[name^="csrf"], meta[name^="token"]');
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name');
    const content = meta.getAttribute('content');
    if (name && content) {
      // 将meta标签转换为可能的header名称
      if (name.includes('csrf')) {
        headers['X-CSRF-Token'] = content;
      } else if (name.includes('token')) {
        headers['Authorization'] = `Bearer ${content}`;
      }
    }
  });
  
  // 尝试从localStorage获取token（GitLab可能存储在这里）
  try {
    const token = localStorage.getItem('gl-token') || 
                  localStorage.getItem('gitlab_token') ||
                  localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // localStorage可能不可用
  }
  
  // 尝试从sessionStorage获取token
  try {
    const token = sessionStorage.getItem('gl-token') || 
                  sessionStorage.getItem('gitlab_token') ||
                  sessionStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // sessionStorage可能不可用
  }
  
  return headers;
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getHeaders') {
    const headers = getPageHeaders();
    sendResponse(headers);
  }
  return true;
});

