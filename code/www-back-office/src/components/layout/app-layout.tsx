import type { ReactNode } from 'react'
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Users,
  Wrench,
} from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
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

type NavItem = {
  title: string
  url: string
  icon: typeof Package
  disabled?: boolean
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
    label: 'Système',
    items: [
      { title: 'Shopify', url: '/shopify', icon: Store },
      { title: 'Outils dev', url: '/dev-tools', icon: Wrench },
    ],
  },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const email = useAuthStore((s) => s.email)
  const logout = useAuthStore((s) => s.logout)

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
                  {group.items.map((item) => (
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
