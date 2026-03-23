import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const listings = [
  {
    title: "Finca verificada en Meta",
    type: "Ganaderia",
    detail: "Operacion lista para trazabilidad, personal y control de gastos.",
  },
  {
    title: "Catalogo comercial de insumos",
    type: "Comercio",
    detail: "Catalogo HTML conectado a activos, imagenes y contacto inmediato.",
  },
  {
    title: "Servicios de llano certificados",
    type: "Servicios",
    detail: "Publicaciones orientadas a confianza, visibilidad y conversion.",
  },
];

export function MarketplacePreview() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {listings.map((listing) => (
        <Card key={listing.title} className="border-border bg-card">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              {listing.type}
            </Badge>
            <CardTitle className="text-2xl leading-tight">{listing.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              {listing.detail}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
