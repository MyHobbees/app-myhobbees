import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getLeads, type Lead } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

const ALL_TAB = 'all'

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState(ALL_TAB)

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [])

  const offers = useMemo(() => {
    if (!leads) return []
    return Array.from(new Set(leads.map((l) => l.subscriptionInterest)))
  }, [leads])

  const kpis = useMemo(() => {
    if (!leads) return null
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const newLast7Days = leads.filter(
      (l) => Date.now() - new Date(l.createdAt).getTime() <= sevenDays,
    ).length

    const counts = new Map<string, number>()
    for (const l of leads) {
      counts.set(l.subscriptionInterest, (counts.get(l.subscriptionInterest) ?? 0) + 1)
    }
    let topOffer = '—'
    let topCount = 0
    for (const [offer, count] of counts) {
      if (count > topCount) {
        topOffer = offer
        topCount = count
      }
    }

    return [
      { label: 'Total inscrits', value: String(leads.length) },
      { label: 'Nouveaux (7j)', value: String(newLast7Days) },
      { label: 'Offre la + demandée', value: topOffer },
    ]
  }, [leads])

  const filtered = useMemo(() => {
    if (!leads) return []
    const query = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (tab !== ALL_TAB && l.subscriptionInterest !== tab) return false
      if (query && !l.email.toLowerCase().includes(query)) return false
      return true
    })
  }, [leads, search, tab])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Inscriptions</h1>
        <p className="text-muted-foreground">
          Leads collectés via le formulaire « Me prévenir » de la boutique
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les inscriptions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(kpis ?? Array.from({ length: 3 }, () => null)).map((kpi, index) => (
          <Card key={index} className="py-4">
            <CardContent className="flex flex-col gap-1 px-4">
              {kpi === null ? (
                <>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-20" />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value={ALL_TAB}>Toutes</TabsTrigger>
            {offers.map((offer) => (
              <TabsTrigger key={offer} value={offer}>
                {offer}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un email…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Activités</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Offre</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads === null && !error
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.activities.map((activity) => (
                          <Badge key={activity} variant="secondary">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.acquisitionChannel}
                    </TableCell>
                    <TableCell>{lead.subscriptionInterest}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.utmSource ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDateTime(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            {leads !== null && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune inscription ne correspond aux filtres
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
