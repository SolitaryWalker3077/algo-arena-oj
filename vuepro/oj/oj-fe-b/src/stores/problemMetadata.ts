import { readonly, reactive } from 'vue'
import { cloneDefaultProblemMetadata } from '@/config/problemFormMetadata'
import type { ProblemFormMetadata } from '@/types/problem'

interface MetadataState {
  data: ProblemFormMetadata
  loading: boolean
  source: 'local'
  warning: string
}

const state = reactive<MetadataState>({
  data: cloneDefaultProblemMetadata(),
  loading: false,
  source: 'local',
  warning: '',
})

export function useProblemMetadataStore() {
  const load = async (): Promise<ProblemFormMetadata> => state.data
  return { state: readonly(state), load }
}
