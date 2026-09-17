import { readonly, reactive } from 'vue'
import { getProblemFormMetadata } from '@/api/problem'
import { cloneDefaultProblemMetadata } from '@/config/problemFormMetadata'
import type { ProblemFormMetadata } from '@/types/problem'

interface MetadataState {
  data: ProblemFormMetadata
  loading: boolean
  source: 'fallback' | 'server'
  warning: string
}

const state = reactive<MetadataState>({
  data: cloneDefaultProblemMetadata(),
  loading: false,
  source: 'fallback',
  warning: '',
})

let pending: Promise<ProblemFormMetadata> | null = null

const isValidMetadata = (value: unknown): value is ProblemFormMetadata => {
  const candidate = value as ProblemFormMetadata
  return Boolean(candidate?.version && Array.isArray(candidate.fields) && candidate.fields.length)
}

/** Global metadata cache. Local form values and drawer visibility remain inside the page components. */
export function useProblemMetadataStore() {
  const load = async (force = false): Promise<ProblemFormMetadata> => {
    if (state.source === 'server' && !force) return state.data
    if (pending && !force) return pending

    state.loading = true
    pending = getProblemFormMetadata()
      .then((metadata: unknown) => {
        if (!isValidMetadata(metadata)) throw new Error('题目字段元数据格式无效')
        state.data = metadata
        state.source = 'server'
        state.warning = ''
        return state.data
      })
      .catch(() => {
        state.data = cloneDefaultProblemMetadata()
        state.source = 'fallback'
        state.warning = '字段配置暂时无法同步，当前使用内置安全配置'
        return state.data
      })
      .finally(() => {
        state.loading = false
        pending = null
      })
    return pending
  }

  return { state: readonly(state), load }
}
