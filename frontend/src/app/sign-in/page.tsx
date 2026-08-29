import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";
import SignInComponent from "@/components/auth/sign-in";
import { MeetAgentIcon } from "@/components/brand/logo";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SignInPage() {
  return (
    <main className="app-shell-bg flex min-h-svh items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-2xl ring-1 ring-border/50 rounded-3xl backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-md p-2 backdrop-blur-md">
            <MeetAgentIcon className="size-full" />
          </div>
          <CardTitle className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
            MeetAgent AI
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Sign in to connect your Google Calendar and start scheduling with AI
          </CardDescription>
        </CardHeader>

        <RedirectIfAuthenticated>
          <SignInComponent />
        </RedirectIfAuthenticated>
      </Card>
    </main>
  );
}

export default SignInPage;
