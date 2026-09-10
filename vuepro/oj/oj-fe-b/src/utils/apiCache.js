/**
 * 通用 TTL 内存缓存
 * -------------------------------------------------------------
 * 为列表型接口提供短时缓存，配合组件实现 stale-while-revalidate：
 * 有缓存先渲染缓存（即使过期），再后台静默拉取最新数据，减少白屏等待。
 *
 * 仅保存在内存（刷新页面后失效），不落地 localStorage/sessionStorage，
 * 避免用户状态、启停用等实时性要求较高的数据展示旧数据。
 */

/**
 * 创建一个带过期时间的缓存实例
 * @param {Object} options
 * @param {number} [options.ttl=30000] 存活时长（毫秒），默认 30s
 */
export function createTtlCache({ ttl = 30000 } = {}) {
  const store = new Map()

  const keyOf = (key) => (typeof key === 'string' ? key : JSON.stringify(key))

  return {
    /** 写入缓存（刷新 TTL） */
    set(key, value) {
      store.set(keyOf(key), { value, expireAt: Date.now() + ttl })
      return value
    },

    /** 仅在缓存【未过期】时返回，否则返回 undefined */
    get(key) {
      const entry = store.get(keyOf(key))
      if (!entry || Date.now() >= entry.expireAt) return undefined
      return entry.value
    },

    /** 无论是否过期都返回缓存值（用于先渲染旧数据再静默刷新） */
    peek(key) {
      return store.get(keyOf(key))?.value
    },

    /** 是否存在且未过期 */
    isFresh(key) {
      const entry = store.get(keyOf(key))
      return !!entry && Date.now() < entry.expireAt
    },

    has(key) {
      return store.has(keyOf(key))
    },

    delete(key) {
      store.delete(keyOf(key))
    },

    /** 清空全部缓存（写操作后调用，保证下次加载拿到最新数据） */
    clear() {
      store.clear()
    },
  }
}
