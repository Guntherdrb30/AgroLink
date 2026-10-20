export const publicNavigation = [
  { href: "/", label: "Inicio" },
  { href: "/plataforma", label: "Plataforma" },
  { href: "/soluciones", label: "Soluciones" },
  { href: "/mercado", label: "Mercado" },
  { href: "/seguridad", label: "Confianza" },
  { href: "/contacto", label: "Contacto" },
] as const;

export function isPublicRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
