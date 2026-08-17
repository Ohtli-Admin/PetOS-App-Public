'use client'

type DateFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function DateField({ label, value, onChange, required }: DateFieldProps) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="date"
        className="field-input"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
          input.showPicker?.()
        }}
      />
    </div>
  )
}
