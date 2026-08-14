import { Suspense } from "react";

import { VerifyForm } from "./verify-form";

export const metadata = { title: "Verify — Passdown" };

export default function VerifyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>
    </main>
  );
}
