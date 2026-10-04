import { reactive, readonly } from 'vue'
import { getUserInfoService } from '@/apis/user'
import { getToken } from '@/utils/cookie'
import { onAuthExpired } from '@/utils/authEvents'

const initialProfile = () => ({
  nickName: 'OJ用户',
  headImage: '',
})

const state = reactive({
  isAuthenticated: Boolean(getToken()),
  profile: initialProfile(),
  isLoading: false,
  error: '',
  hasLoaded: false,
})

let pendingRequest = null
let requestVersion = 0

function normalizeProfile(data) {
  return {
    nickName: typeof data?.nickName === 'string' && data.nickName.trim()
      ? data.nickName.trim()
      : 'OJ用户',
    headImage: typeof data?.headImage === 'string' ? data.headImage.trim() : '',
  }
}

export const userState = readonly(state)

export function syncAuthentication() {
  state.isAuthenticated = Boolean(getToken())
}

export function updateCurrentUserProfile(profile) {
  state.profile = normalizeProfile({ ...state.profile, ...profile })
  state.hasLoaded = true
  state.error = ''
}

export function clearCurrentUser() {
  requestVersion += 1
  pendingRequest = null
  state.isAuthenticated = false
  state.profile = initialProfile()
  state.isLoading = false
  state.error = ''
  state.hasLoaded = false
}

export function fetchCurrentUser({ force = false } = {}) {
  syncAuthentication()

  if (!state.isAuthenticated) {
    clearCurrentUser()
    return Promise.resolve(null)
  }

  if (pendingRequest) return pendingRequest
  if (state.hasLoaded && !force) return Promise.resolve(state.profile)

  const version = ++requestVersion
  state.isLoading = true
  state.error = ''

  pendingRequest = getUserInfoService()
    .then((result) => {
      if (version !== requestVersion) return null
      state.profile = normalizeProfile(result.data)
      state.hasLoaded = true
      return state.profile
    })
    .catch((error) => {
      if (version === requestVersion) {
        state.error = error.message || '用户信息加载失败，请稍后重试'
        state.hasLoaded = false
        syncAuthentication()
      }
      throw error
    })
    .finally(() => {
      if (version === requestVersion) {
        state.isLoading = false
        pendingRequest = null
      }
    })

  return pendingRequest
}

onAuthExpired(clearCurrentUser)
