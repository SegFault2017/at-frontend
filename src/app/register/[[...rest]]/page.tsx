import { SignUp } from "@/components/AuthProvider";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp oauthFlow="redirect" />
    </div>
  );
}
