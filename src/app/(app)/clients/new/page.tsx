import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeading } from "@/components/ui/page-heading";

export default function NewClientPage() {

  return <>
          <Link className="back-link" href="/clients">
            <ChevronLeft size={15} /> Voltar para clientes
          </Link>

          <PageHeading
           eyebrow="NOVO RELACIONAMENTO" 
           title="Cadastrar cliente" 
           description="Comece com as informações essenciais. Você pode completar o perfil depois." 
          />
          
          <ClientForm />
        </>;
  
}
