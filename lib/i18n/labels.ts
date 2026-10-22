/** Etiquetas visibles en español; los códigos de base de datos permanecen intactos. */
export const rolesEs: Record<string,string> = {
 ROOT:"Administrador principal", PLATFORM_ADMIN:"Administrador de plataforma", TENANT_OWNER:"Propietario",
 TENANT_ADMIN:"Administrador", FARM_MANAGER:"Encargado de finca", ACCOUNTING:"Contador",
 VETERINARIAN:"Veterinario", OPERATOR:"Operador", NO_ROLE:"Sin rol",
};
export const invitationEs: Record<string,string> = {
 PENDING:"Pendiente de aceptación", ACCEPTED:"Aceptada", EXPIRED:"Vencida", REVOKED:"Revocada",
};
export const financeEs: Record<string,string> = {
 EXPENSE:"Gasto operativo", INCOME:"Ingreso", PAYABLE:"Cuenta por pagar",
 RECEIVABLE:"Cuenta por cobrar", PAYMENT_IN:"Cobro de cuenta por cobrar", PAYMENT_OUT:"Pago de cuenta por pagar",
};
export const supplierEs: Record<string,string>={SUPPLIER:"Proveedor",CUSTOMER:"Cliente",BOTH:"Proveedor y cliente"};
export const stockEs: Record<string,string>={RECEIPT:"Entrada o recepción",USE:"Consumo o salida",ADJUST_PLUS:"Ajuste positivo",ADJUST_MINUS:"Ajuste negativo"};
export const itemEs: Record<string,string>={SUPPLY:"Insumo",ASSET:"Equipo o activo fijo"};
export const statusEs: Record<string,string>={
 DRAFT:"Borrador",PENDING:"Pendiente",ACTIVE:"Activo",INACTIVE:"Inactivo",
 SHEETS_READY:"Planillas listas", RESULTS_CAPTURED:"Resultados registrados", APPLIED:"Aplicado",
 CANCELLED:"Cancelado",COMPLETED:"Finalizado",ACCEPTED:"Aceptado",REJECTED:"Rechazado",
 VERIFIED:"Verificado",IN_REVIEW:"En revisión",REQUIRES_FIX:"Requiere correcciones",
};
export function textoEs(valor:string | null | undefined, diccionario:Record<string,string>=statusEs){
 if(!valor)return "Sin especificar";
 return diccionario[valor] ?? valor.replaceAll("_"," ").toLocaleLowerCase("es-VE");
}
