function cloneFallback(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))
}

/**
 * 为尚未交付的后端接口提供可视化预览数据。
 * 认证失效与主动取消不会被吞掉，避免掩盖真实登录状态和竞态问题。
 */
export async function withPreviewFallback(request, fallback) {
  try {
    return { data: await request(), preview: false, error: null }
  } catch (error) {
    if (error?.code === 3001 || error?.name === 'CanceledError' || error?.name === 'AbortError') {
      throw error
    }

    const value = typeof fallback === 'function' ? fallback(error) : fallback
    return {
      data: cloneFallback(value),
      preview: true,
      error,
    }
  }
}

