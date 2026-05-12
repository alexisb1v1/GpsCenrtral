import LoginForm from "@/app/features/auth/ui/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión - FleetControl",
  description: "Ingrese a su cuenta de gestión de flotas corporativas.",
};

export default function LoginPage() {
  return <LoginForm />;
}
