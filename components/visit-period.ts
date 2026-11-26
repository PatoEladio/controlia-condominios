// Una visita puede valer por un período (ej. arriendos de condominios): fecha de inicio → fecha de término.
// En visitas de un solo día, endDate es igual a date (o viene vacío en datos antiguos).
export const isPeriodVisit = (v: { date: string; endDate?: string | null }): v is { date: string; endDate: string } =>
  Boolean(v.endDate) && (v.endDate as string) > v.date
