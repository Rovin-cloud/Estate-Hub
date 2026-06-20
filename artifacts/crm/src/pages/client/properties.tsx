import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Hash, AlertCircle } from "lucide-react";

type Property = { id: number; projectName: string; location: string; unitNumber: string | null; price: number; availability: string; description: string | null };

export default function ClientProperties() {
  const authFetch = useAuthFetch();

  const { data: properties = [], isLoading, isError } = useQuery<Property[]>({
    queryKey: ["client-properties"],
    queryFn: () => authFetch("/api/client/properties"),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">No properties linked to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Properties</h1>
        <p className="text-sm text-muted-foreground">Properties purchased or reserved under your account</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : properties.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No properties found</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{p.projectName}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.availability === "Available" ? "bg-emerald-100 text-emerald-700" : p.availability === "Sold" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {p.availability}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />{p.location}
                </div>
                {p.unitNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="w-4 h-4" />Unit {p.unitNumber}
                  </div>
                )}
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="pt-2 border-t">
                  <p className="text-lg font-bold text-primary">৳{p.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total price</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
