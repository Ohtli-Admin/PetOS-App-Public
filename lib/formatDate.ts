export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return ''
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }