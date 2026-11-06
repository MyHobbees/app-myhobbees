import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis } from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { getPostHogOverview, type PostHogOverview } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type PeriodKey = 7 | 30 | 90

const periods: { key: PeriodKey; label: string }[] = [
  { key: 7, label: '7 jours' },
  { key: 30, label: '30 jours' },
  { key: 90, label: '90 jours' },
]

const pageviewsConfig = {
  count: { label: 'Pages vues', color: 'var(--brand)' },
} satisfies ChartConfig

const eventsConfig = {
  cta_click: { label: 'Clics CTA', color: 'var(--chart-1)' },
  offer_click: { label: 'Clics offre', color: 'var(--chart-2)' },
  waitlist_signup: { label: 'Inscriptions', color: 'var(--chart-3)' },
  app_click: { label: 'Clics app', color: 'var(--chart-4)' },
} satisfies ChartConfig

const offersConfig = {
  count: { label: 'Clics', color: 'var(--chart-2)' },
} satisfies ChartConfig

const eventLabels: Record<string, string> = {
  cta_click: 'Clics CTA',
  offer_click: 'Clics offre',
  waitlist_signup: 'Inscriptions',
  app_click: 'Clics app',
}

function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(1)} %`
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>(30)
  const [overview, setOverview] = useState<PostHogOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOverview(null)
    setError(null)
    getPostHogOverview(period)
      .then(setOverview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [period])

  const kpis = useMemo(() => {
    if (!overview) return null
    return [
      { label: 'Visiteurs', value: String(overview.visitors) },
      { label: 'Clics CTA', value: String(overview.ctaClicks) },
      { label: 'Clics offre', value: String(overview.offerClicks) },
      { label: 'Inscriptions', value: String(overview.waitlistSignups) },
      {
        label: 'Taux visiteur → email',
        value: formatPercent(overview.visitorToEmailRate),
      },
    ]
  }, [overview])

  const eventsData = useMemo(() => {
    if (!overview) return []
    return overview.eventCounts.map((e) => ({
      event: eventLabels[e.event] ?? e.event,
      eventKey: e.event,
      count: e.count,
    }))
  }, [overview])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Activité du site mesurée par PostHog sur la période
          </p>
        </div>
        <div className="flex items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                period === p.key
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les statistiques PostHog</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {(kpis ?? Array.from({ length: 5 }, () => null)).map((kpi, index) => (
          <Card key={index} className="py-4">
            <CardContent className="flex flex-col gap-1 px-4">
              {kpi === null ? (
                <>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <span className="text-2xl font-semibold">{kpi.value}</span>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pages vues par jour</CardTitle>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={pageviewsConfig} className="h-64 w-full">
              <LineChart data={overview?.pageviewsByDay ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(value: string) => formatDate(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatDate(String(value))}
                    />
                  }
                />
                <Line
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-count)', strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Events par type</CardTitle>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ChartContainer config={eventsConfig} className="h-56 w-full">
                <BarChart data={eventsData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="event"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="eventKey" />}
                  />
                  <Bar dataKey="count" radius={4}>
                    {eventsData.map((entry) => (
                      <Cell
                        key={entry.eventKey}
                        fill={`var(--color-${entry.eventKey})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clics par offre</CardTitle>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-56 w-full" />
            ) : overview.offerClicksByOffer.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun clic sur une offre sur la période
              </p>
            ) : (
              <ChartContainer config={offersConfig} className="h-56 w-full">
                <BarChart data={overview.offerClicksByOffer}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="offer"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
