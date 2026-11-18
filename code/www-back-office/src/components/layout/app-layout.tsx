import type { ReactNode } from 'react'
import {
  Boxes,
  Database,
  LayoutDashboard,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Package,
  ShieldCheck,
  Store,
  Sun,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'
import { useEnvStore, type Env } from '@/stores/env'
import { useThemeStore, type Theme } from '@/stores/theme'

type NavItem = {
  title: string
  url: string
  icon: typeof Package
  disabled?: boolean
  superAdminOnly?: boolean
  stgOnly?: boolean
  prdOnly?: boolean
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Boutique',
    items: [
      { title: 'Tableau de bord', url: '/', icon: LayoutDashboard },
      { title: 'Commandes', url: '/orders', icon: Package },
      { title: 'Produits', url: '/products', icon: Boxes },
      { title: 'Clients', url: '/customers', icon: Users },
    ],
  },
  {
    label: 'Lancement',
    items: [
      { title: 'Inscriptions', url: '/leads', icon: Mail },
      { title: 'Analytics', url: '/analytics', icon: TrendingUp },
    ],
  },
  {
    label: 'Système',
    items: [
      { title: 'Shopify', url: '/shopify', icon: Store },
      { title: 'Outils dev', url: '/dev-tools', icon: Wrench, stgOnly: true },
      {
        title: 'Administrateurs',
        url: '/admins',
        icon: ShieldCheck,
        superAdminOnly: true,
      },
      { title: 'Staging DB', url: '/staging-db', icon: Database, prdOnly: true },
    ],
  },
]

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
]

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const CurrentIcon =
    themeOptions.find((o) => o.value === theme)?.icon ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Changer de thème">
          <CurrentIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={option.value === theme ? 'text-brand' : undefined}
          >
            <option.icon />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const email = useAuthStore((s) => s.email)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const logout = useAuthStore((s) => s.logout)
  const env = useEnvStore((s) => s.env)

  function isActive(url: string) {
    return url === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(url)
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 py-1 text-lg font-semibold">MyHobbees</span>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items
                    .filter((item) => !item.superAdminOnly || isSuperAdmin)
                    .filter((item) => !item.stgOnly || env === ('stg' satisfies Env))
                    .filter((item) => !item.prdOnly || env === ('prd' satisfies Env))
                    .map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton disabled className="opacity-50">
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            className="data-[active=true]:bg-brand/10 data-[active=true]:text-brand"
                          >
                            <Link to={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{email}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut />
              Déconnexion
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
