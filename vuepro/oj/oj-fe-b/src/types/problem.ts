/** A value accepted by the metadata-driven problem form. */
export type FormValue = string | number | boolean | string[] | number[] | null | undefined

/** Built-in field kinds. Additional string values can be handled by a registered renderer. */
export type ProblemFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'number'
  | 'markdown'
  | 'code'
  | (string & {})

export interface FieldOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface FieldValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  format?: 'email' | 'url' | 'phone'
  pattern?: string
  message?: string
}

export interface EditorFieldOptions {
  language?: string
  languageField?: string
  height?: number
  minimap?: boolean
}

export interface ProblemFieldMetadata {
  name: string
  label: string
  type: ProblemFieldType
  placeholder?: string
  help?: string
  defaultValue?: FormValue
  options?: FieldOption[]
  validation?: FieldValidationRule[]
  colSpan?: 1 | 2
  rows?: number
  min?: number
  max?: number
  step?: number
  clearable?: boolean
  filterable?: boolean
  editor?: EditorFieldOptions
  /** Fields such as an editor-language preference can stay in the UI but be omitted from API payloads. */
  submit?: boolean
  group?: 'basic' | 'statement' | 'code' | (string & {})
}

export interface ProblemFormMetadata {
  version: string
  title?: string
  description?: string
  layout?: {
    columns?: 1 | 2
    labelWidth?: number
  }
  behavior?: {
    closeOnOverlay?: boolean
    closeOnEscape?: boolean
    autosaveSeconds?: number
  }
  fields: ProblemFieldMetadata[]
}

export type ProblemFormValues = Record<string, FormValue>
export type ProblemFormErrors = Record<string, string>

export interface ProblemRecord extends ProblemFormValues {
  id?: string
  title: string
  difficulty: number | ''
  /** True while a successful create is waiting for the canonical server list record. */
  pendingSync?: boolean
}

/** Extension point for contest- or user-specific problem types. */
export interface ProblemTypeExtension {
  type: string
  fields: ProblemFieldMetadata[]
  normalize?: (values: ProblemFormValues) => ProblemFormValues
}

/** Extension point invoked after Monaco has created an editor instance. */
export interface CodeEditorPlugin {
  id: string
  setup: (context: { monaco: unknown; editor: unknown }) => void | (() => void)
}
