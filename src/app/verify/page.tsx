import { VerifyForm } from "./verify-form";

export const metadata = { title: "Verify — Passdown" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/home";
  const linkFailed = params.error === "link";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      {/*
        `next` is read here rather than with useSearchParams in the form.
        That hook would force the whole subtree behind a Suspense boundary and
        skip server rendering, so the first thing a student saw on the sign-in
        screen would be nothing at all.
      */}
      <VerifyForm next={next} linkFailed={linkFailed} />
    </main>
  );
}
