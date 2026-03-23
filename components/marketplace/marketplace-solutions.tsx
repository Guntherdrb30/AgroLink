import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blocks = [
  {
    title: "Auth y acceso",
    detail: "Layouts separados, registro, login, Google adicional y recuperacion preparada.",
  },
  {
    title: "Dashboard SaaS",
    detail: "Sidebar, header, tenant switcher y espacio base para modulos operativos.",
  },
  {
    title: "PWA institucional",
    detail: "Manifest, metadata, iconos y registro del service worker ya integrados.",
  },
  {
    title: "Contacto comercial",
    detail: "Canal institucional de WhatsApp visible en header y accion flotante.",
  },
];

export function MarketplaceSolutions() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {blocks.map((block) => (
        <Card key={block.title} className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              {block.detail}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
