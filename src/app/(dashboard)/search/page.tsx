import { SearchPanel } from "@/components/search-panel";

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Busca
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Pesquisar clientes
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Placa, nome, telefone ou e-mail. Listamos veículos e o último recibo de cada
          um.
        </p>
      </header>
      <SearchPanel />
    </div>
  );
}
