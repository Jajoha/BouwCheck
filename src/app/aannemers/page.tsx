import { redirect } from "next/navigation";

/**
 * Er is bewust geen doorzoekbare lijst om zelf aannemers te vergelijken:
 * BouwCheck stelt op basis van je project teams samen. Oude links gaan naar de intake.
 */
export default function ContractorsIndex() {
  redirect("/projecten/nieuw");
}
